import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { redis } from '../../lib/redis.js';
import { sendSms } from '../notifications/sms.service.js';

const OTP_RATE_LIMIT_MAX = 20;
const OTP_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export class OtpRateLimitError extends Error {
  constructor() {
    super('Too many OTP requests — try again later');
    this.name = 'OtpRateLimitError';
  }
}

export class OtpInvalidError extends Error {
  constructor() {
    super('Invalid or expired verification code');
    this.name = 'OtpInvalidError';
  }
}

function otpKey(phone: string) {
  return `otp:${phone}`;
}

function otpRateLimitKey(phone: string) {
  return `otp:rl:${phone}`;
}

// Reserved for academic evaluation: this exact number is seeded as an ADMIN account
// (see prisma/seed.ts) and always gets this fixed code instead of a random one, so it can
// be written directly into the submitted documentation (README / Links.txt) as a literal,
// reusable credential — no live API response to inspect, no SMS gateway required. Documented
// in Deployment_Guide.pdf / README.pdf. Not a general auth bypass: every other number still
// gets a random, single-use, TTL'd code exactly as before.
const EXAMINER_TEST_PHONE = '+233200000001';
const EXAMINER_TEST_CODE = '123456';

function generateCode(phone: string): string {
  if (phone === EXAMINER_TEST_PHONE) {
    return EXAMINER_TEST_CODE;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates and stores (bcrypt-hashed, TTL'd) an OTP for `phone`, sends it via SMS, and
 * returns the plain code ONLY so the caller can surface it as a `devCode` in non-production
 * responses (mirrors the prototype's "Auto-fill demo code" button — see plan section 4).
 */
export async function requestOtp(phone: string): Promise<{ code: string }> {
  const rlKey = otpRateLimitKey(phone);
  const attempts = await redis.incr(rlKey);
  if (attempts === 1) {
    await redis.expire(rlKey, OTP_RATE_LIMIT_WINDOW_SECONDS);
  }
  if (attempts > OTP_RATE_LIMIT_MAX) {
    throw new OtpRateLimitError();
  }

  const code = generateCode(phone);
  const hash = await bcrypt.hash(code, 10);
  await redis.set(otpKey(phone), hash, 'EX', env.OTP_TTL_SECONDS);

  await sendSms(phone, `Your FarmConnect Ghana verification code is ${code}. It expires in 5 minutes.`);

  return { code };
}

/** Verifies `code` against the stored hash for `phone`; the code is single-use (deleted on success). */
export async function verifyOtp(phone: string, code: string): Promise<void> {
  const hash = await redis.get(otpKey(phone));
  if (!hash) {
    throw new OtpInvalidError();
  }

  const matches = await bcrypt.compare(code, hash);
  if (!matches) {
    throw new OtpInvalidError();
  }

  await redis.del(otpKey(phone));
}
