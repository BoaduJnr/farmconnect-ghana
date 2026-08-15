import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks the underlying ioredis client entirely so these tests can force failures on demand
// (simulating the production incident this facade exists for: Upstash's free-tier request
// quota running out mid-month) without touching a real Redis instance. lib/redis.ts
// constructs its client once at module load, so each test re-imports fresh via
// vi.resetModules() (same isolation pattern as gemini.service.unconfigured.test.ts).
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockIncr = vi.fn();
const mockExpire = vi.fn();

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
    del: mockDel,
    incr: mockIncr,
    expire: mockExpire,
    on: vi.fn(),
  })),
}));

describe('redis resilience facade', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGet.mockReset();
    mockSet.mockReset();
    mockDel.mockReset();
    mockIncr.mockReset();
    mockExpire.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes through to the real client when it succeeds', async () => {
    mockSet.mockResolvedValue('OK');
    mockGet.mockResolvedValue('hello');

    const { redis } = await import('./redis.js');
    await redis.set('k', 'hello', 'EX', 60);
    expect(mockSet).toHaveBeenCalledWith('k', 'hello', 'EX', 60);

    const val = await redis.get('k');
    expect(val).toBe('hello');
    expect(mockGet).toHaveBeenCalledWith('k');
  });

  it('falls back to in-memory storage when the client throws (quota exceeded), and a value written during the outage is still readable afterwards', async () => {
    const quotaError = new Error('ERR max requests limit exceeded. Limit: 500000, Usage: 500010');
    mockSet.mockRejectedValue(quotaError);
    mockGet.mockRejectedValue(quotaError);

    const { redis } = await import('./redis.js');
    await redis.set('otp:+233200000001', 'bcrypt-hash', 'EX', 300);
    const val = await redis.get('otp:+233200000001');
    expect(val).toBe('bcrypt-hash');
  });

  it('incr/expire fall back the same way (the OTP rate-limit counter)', async () => {
    mockIncr.mockRejectedValue(new Error('down'));
    mockExpire.mockRejectedValue(new Error('down'));

    const { redis } = await import('./redis.js');
    const first = await redis.incr('otp:rl:+233241234567');
    const second = await redis.incr('otp:rl:+233241234567');
    expect(first).toBe(1);
    expect(second).toBe(2);
    await expect(redis.expire('otp:rl:+233241234567', 3600)).resolves.toBe(1);
  });

  it('del clears the in-memory copy too, so a value cannot resurface after deletion', async () => {
    mockSet.mockRejectedValue(new Error('down'));
    mockDel.mockRejectedValue(new Error('down'));
    mockGet.mockRejectedValue(new Error('down'));

    const { redis } = await import('./redis.js');
    await redis.set('otp:+233241234567', 'code-hash', 'EX', 300);
    await redis.del('otp:+233241234567');
    expect(await redis.get('otp:+233241234567')).toBeNull();
  });

  it('checkRedisHealth reflects the real backend truthfully, unlike the always-degrading facade', async () => {
    mockSet.mockResolvedValueOnce('OK').mockRejectedValueOnce(new Error('down'));
    mockGet.mockResolvedValueOnce('1');

    const { checkRedisHealth } = await import('./redis.js');
    expect(await checkRedisHealth()).toBe(true);
    expect(await checkRedisHealth()).toBe(false);
  });
});
