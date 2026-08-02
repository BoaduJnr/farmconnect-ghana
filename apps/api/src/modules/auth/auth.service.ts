import { randomUUID } from 'node:crypto';
import { Locale, type MomoProvider, Role } from '@farmconnect/shared';
import { env } from '../../config/env.js';
import { parseDurationToSeconds } from '../../lib/duration.js';
import { redis } from '../../lib/redis.js';
import { createUser, findUserByPhone, findUserById } from '../users/users.repository.js';
import * as otpService from './otp.service.js';
import {
  InvalidTokenError,
  signAccessToken,
  signPreAuthToken,
  signRefreshToken,
  verifyPreAuthToken,
  verifyRefreshToken,
} from './jwt.util.js';

export class UserNotFoundError extends Error {
  constructor() {
    super('User not found');
    this.name = 'UserNotFoundError';
  }
}

export class AccountSuspendedError extends Error {
  constructor() {
    super('This account has been suspended — contact support for help');
    this.name = 'AccountSuspendedError';
  }
}

export interface PublicUser {
  id: string;
  phone: string;
  role: Role;
  name: string | null;
  locale: Locale;
  isVerified: boolean;
  momoProvider: MomoProvider | null;
  momoPhone: string | null;
  momoAccountName: string | null;
}

function toPublicUser(user: {
  id: string;
  phone: string;
  role: string;
  name: string | null;
  locale: string;
  isVerified: boolean;
  momoProvider: string | null;
  momoPhone: string | null;
  momoAccountName: string | null;
}): PublicUser {
  return {
    id: user.id,
    phone: user.phone,
    role: user.role as Role,
    name: user.name,
    locale: user.locale as Locale,
    isVerified: user.isVerified,
    momoProvider: user.momoProvider as MomoProvider | null,
    momoPhone: user.momoPhone,
    momoAccountName: user.momoAccountName,
  };
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TTL_SECONDS = parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN);

function refreshAllowlistKey(userId: string, jti: string) {
  return `refresh:${userId}:${jti}`;
}

async function issueTokenPair(userId: string, role: Role): Promise<TokenPair> {
  const jti = randomUUID();
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId, jti });
  await redis.set(refreshAllowlistKey(userId, jti), '1', 'EX', REFRESH_TTL_SECONDS);
  return { accessToken, refreshToken };
}

export async function requestOtp(phone: string): Promise<{ devCode?: string }> {
  const { code } = await otpService.requestOtp(phone);
  return env.NODE_ENV === 'production' ? {} : { devCode: code };
}

export type VerifyOtpResult =
  | { status: 'needs_role'; preAuthToken: string }
  | ({ status: 'authenticated'; user: PublicUser } & TokenPair);

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  await otpService.verifyOtp(phone, code);

  const existing = await findUserByPhone(phone);
  if (!existing) {
    return { status: 'needs_role', preAuthToken: signPreAuthToken(phone) };
  }
  if (existing.isSuspended) {
    throw new AccountSuspendedError();
  }

  const tokens = await issueTokenPair(existing.id, existing.role as Role);
  return { status: 'authenticated', user: toPublicUser(existing), ...tokens };
}

export async function selectRole(
  preAuthToken: string,
  role: Role,
  locale: Locale,
): Promise<{ user: PublicUser } & TokenPair> {
  const { phone } = verifyPreAuthToken(preAuthToken);

  const existing = await findUserByPhone(phone);
  const user = existing ?? (await createUser({ phone, role, locale }));

  const tokens = await issueTokenPair(user.id, user.role as Role);
  return { user: toPublicUser(user), ...tokens };
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const { sub, jti } = verifyRefreshToken(refreshToken);

  const stillAllowed = await redis.get(refreshAllowlistKey(sub, jti));
  if (!stillAllowed) {
    throw new InvalidTokenError('Refresh token has been revoked or already used');
  }
  await redis.del(refreshAllowlistKey(sub, jti));

  const user = await findUserById(sub);
  if (!user) {
    throw new UserNotFoundError();
  }
  if (user.isSuspended) {
    throw new AccountSuspendedError();
  }

  return issueTokenPair(user.id, user.role as Role);
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    const { sub, jti } = verifyRefreshToken(refreshToken);
    await redis.del(refreshAllowlistKey(sub, jti));
  } catch {
    // Already invalid/expired — logging out is a no-op in that case.
  }
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new UserNotFoundError();
  }
  return toPublicUser(user);
}
