import type { Locale, MomoProvider, Role } from '@farmconnect/shared';

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

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type VerifyOtpResponse =
  | { status: 'needs_role'; preAuthToken: string }
  | ({ status: 'authenticated'; user: PublicUser } & TokenPair);
