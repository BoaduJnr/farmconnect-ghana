import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicUser, TokenPair } from '../features/auth/types';

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: { user: PublicUser } & TokenPair) => void;
  setTokens: (tokens: TokenPair) => void;
  updateUser: (patch: Partial<PublicUser>) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      updateUser: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'farmconnect-auth' },
  ),
);
