import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { TokenPair } from '../features/auth/types';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const apiClient = axios.create({ baseURL: `${API_BASE_URL}/api` });

// Separate instance (no interceptors) so the refresh call itself can never trigger a refresh loop.
const refreshClient = axios.create({ baseURL: `${API_BASE_URL}/api` });

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

let refreshInFlight: Promise<TokenPair> | null = null;

async function refreshSession(): Promise<TokenPair> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  const { data } = await refreshClient.post<TokenPair>('/auth/refresh', { refreshToken });
  useAuthStore.getState().setTokens(data);
  return data;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isTokenExpired =
      error.response?.status === 401 &&
      (error.response.data as { code?: string } | undefined)?.code === 'TOKEN_EXPIRED';

    if (!config || !isTokenExpired || config._retried) {
      if (error.response?.status === 401) {
        useAuthStore.getState().clearSession();
      }
      throw error;
    }

    config._retried = true;
    try {
      refreshInFlight ??= refreshSession().finally(() => {
        refreshInFlight = null;
      });
      await refreshInFlight;
      return apiClient(config);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      throw refreshError;
    }
  },
);
