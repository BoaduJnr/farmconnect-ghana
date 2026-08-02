import type { Locale, Role } from '@farmconnect/shared';
import { apiClient } from '../../lib/apiClient';
import type { PublicUser, TokenPair, VerifyOtpResponse } from './types';

export async function requestOtp(phone: string): Promise<{ message: string; devCode?: string }> {
  const { data } = await apiClient.post('/auth/otp/request', { phone });
  return data;
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const { data } = await apiClient.post('/auth/otp/verify', { phone, code });
  return data;
}

export async function selectRole(
  preAuthToken: string,
  role: Role,
  locale: Locale,
): Promise<{ user: PublicUser } & TokenPair> {
  const { data } = await apiClient.post('/auth/role', { preAuthToken, role, locale });
  return data;
}

export async function fetchMe(): Promise<{ user: PublicUser }> {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}
