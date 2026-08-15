import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const client = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
});

client.on('error', (err) => {
  logger.error({ err }, '[redis] connection error');
});

// --- In-memory fallback ----------------------------------------------------------------
// Render's free tier runs a single instance and restarts often (15-min idle sleep), so this
// is a best-effort degradation, not a durable substitute for real Redis -- but it's strictly
// better than the alternative once the plan's request quota runs out (as happened in
// production: Upstash's free tier caps at 500k commands/month), which otherwise breaks login
// outright for every user, since every OTP request touches Redis for rate-limiting and code
// storage. A session surviving until the next cold start beats "nobody can log in until next
// month". No periodic sweep of expired entries -- capstone-scale traffic plus Render's
// frequent free-tier restarts make unbounded growth a non-issue in practice.
interface MemEntry {
  value: string;
  expiresAt: number | null; // epoch ms; null = no expiry
}
const memStore = new Map<string, MemEntry>();

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key: string, value: string, ttlSeconds?: number) {
  memStore.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}

function memIncr(key: string): number {
  const next = Number(memGet(key) ?? '0') + 1;
  // INCR never touches an existing TTL in real Redis -- callers set it separately via
  // EXPIRE (see otp.service.ts's rate-limit counter), so preserve whatever's already there.
  const existing = memStore.get(key);
  memStore.set(key, { value: String(next), expiresAt: existing?.expiresAt ?? null });
  return next;
}

function memExpire(key: string, ttlSeconds: number) {
  const entry = memStore.get(key);
  if (entry) entry.expiresAt = Date.now() + ttlSeconds * 1000;
}

// --- Circuit breaker ---------------------------------------------------------------------
// Once a command fails, skip trying Redis for a short cooldown instead of eating a slow
// timeout on every subsequent request. A quota-exceeded error responds instantly, but a
// genuine connection problem could hang for the full retry budget otherwise.
const COOLDOWN_MS = 30_000;
let redisDownUntil = 0;

function redisIsDown(): boolean {
  return Date.now() < redisDownUntil;
}

function markRedisDown(err: unknown) {
  redisDownUntil = Date.now() + COOLDOWN_MS;
  logger.warn({ err }, `[redis] command failed — falling back to in-memory storage for ${COOLDOWN_MS / 1000}s`);
}

/** Resilient facade over ioredis exposing only the handful of commands this app actually
 * uses. Every write shadow-writes to the in-memory store too (regardless of whether Redis
 * succeeded), and reads check Redis first, then memory -- so a value written during an
 * outage stays readable even after Redis recovers mid-TTL, and vice versa. Feature code
 * (otp.service.ts, auth.service.ts, weather.service.ts) never needs to know which store
 * actually answered. */
export const redis = {
  async get(key: string): Promise<string | null> {
    if (!redisIsDown()) {
      try {
        const val = await client.get(key);
        if (val !== null) return val;
        return memGet(key); // not in Redis -- might have been written during a prior outage
      } catch (err) {
        markRedisDown(err);
      }
    }
    return memGet(key);
  },

  async set(key: string, value: string, _mode: 'EX', ttlSeconds: number): Promise<'OK'> {
    memSet(key, value, ttlSeconds);
    if (!redisIsDown()) {
      try {
        await client.set(key, value, 'EX', ttlSeconds);
      } catch (err) {
        markRedisDown(err);
      }
    }
    return 'OK';
  },

  async del(key: string): Promise<number> {
    memStore.delete(key);
    if (!redisIsDown()) {
      try {
        return await client.del(key);
      } catch (err) {
        markRedisDown(err);
      }
    }
    return 1;
  },

  async incr(key: string): Promise<number> {
    if (!redisIsDown()) {
      try {
        const next = await client.incr(key);
        memSet(key, String(next), undefined);
        return next;
      } catch (err) {
        markRedisDown(err);
      }
    }
    return memIncr(key);
  },

  async expire(key: string, ttlSeconds: number): Promise<number> {
    memExpire(key, ttlSeconds);
    if (!redisIsDown()) {
      try {
        return await client.expire(key, ttlSeconds);
      } catch (err) {
        markRedisDown(err);
      }
    }
    return 1;
  },
};

/** For /health only -- tests the real backend directly, bypassing the fallback above on
 * purpose. The facade is designed to never surface a Redis failure to feature code, which
 * means it must never be used to answer "is Redis actually working" -- that blind spot is
 * exactly how the production quota-exhaustion outage went undetected: PING alone kept
 * succeeding (seemingly quota-exempt) while every real command failed. */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const key = 'health:check';
    await client.set(key, '1', 'EX', 5);
    return (await client.get(key)) === '1';
  } catch (err) {
    logger.error({ err }, '[redis] health check failed');
    return false;
  }
}
