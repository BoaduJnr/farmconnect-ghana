import { describe, expect, it } from 'vitest';
import { Role } from '@farmconnect/shared';
import {
  InvalidTokenError,
  signAccessToken,
  signPreAuthToken,
  signRefreshToken,
  verifyAccessToken,
  verifyPreAuthToken,
  verifyRefreshToken,
} from './jwt.util.js';

describe('jwt.util', () => {
  it('round-trips an access token', () => {
    const token = signAccessToken({ sub: 'user_1', role: Role.FARMER });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user_1');
    expect(decoded.role).toBe(Role.FARMER);
  });

  it('round-trips a refresh token', () => {
    const token = signRefreshToken({ sub: 'user_1', jti: 'jti_1' });
    const decoded = verifyRefreshToken(token);
    expect(decoded).toMatchObject({ sub: 'user_1', jti: 'jti_1' });
  });

  it('round-trips a pre-auth token', () => {
    const token = signPreAuthToken('+233241234567');
    expect(verifyPreAuthToken(token).phone).toBe('+233241234567');
  });

  it('rejects a garbage token', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow(InvalidTokenError);
    expect(() => verifyRefreshToken('not-a-jwt')).toThrow(InvalidTokenError);
    expect(() => verifyPreAuthToken('not-a-jwt')).toThrow(InvalidTokenError);
  });

  it('rejects a refresh token passed to verifyPreAuthToken (wrong purpose)', () => {
    const token = signRefreshToken({ sub: 'user_1', jti: 'jti_1' });
    expect(() => verifyPreAuthToken(token)).toThrow(InvalidTokenError);
  });
});
