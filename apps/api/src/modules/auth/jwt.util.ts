import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@farmconnect/shared';
import { env } from '../../config/env.js';

// env.JWT_EXPIRES_IN/JWT_REFRESH_EXPIRES_IN are validated at startup (config/env.ts) but typed
// as plain `string`, while jsonwebtoken's SignOptions wants its own narrower duration-string type.
const asExpiresIn = (value: string) => value as SignOptions['expiresIn'];

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

const PRE_AUTH_PURPOSE = 'role-select';

export interface PreAuthTokenPayload {
  phone: string;
  purpose: typeof PRE_AUTH_PURPOSE;
}

export class InvalidTokenError extends Error {
  constructor(message = 'Invalid or expired token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: asExpiresIn(env.JWT_EXPIRES_IN) });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  } catch {
    throw new InvalidTokenError();
  }
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: asExpiresIn(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new InvalidTokenError();
  }
}

/** Short-lived token scoped only to POST /auth/role — issued after OTP verify for a brand-new phone. */
export function signPreAuthToken(phone: string): string {
  const payload: PreAuthTokenPayload = { phone, purpose: PRE_AUTH_PURPOSE };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '10m' });
}

export function verifyPreAuthToken(token: string): PreAuthTokenPayload {
  let decoded: PreAuthTokenPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as PreAuthTokenPayload;
  } catch {
    throw new InvalidTokenError();
  }
  if (decoded.purpose !== PRE_AUTH_PURPOSE) {
    throw new InvalidTokenError('Token is not valid for role selection');
  }
  return decoded;
}
