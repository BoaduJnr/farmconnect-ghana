import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MomoProvider, Role } from '@farmconnect/shared';
import '../i18n';
import { useAuthStore } from '../store/authStore';
import Profile from './Profile';

function renderProfile() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Profile', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({
      user: {
        id: 'user_1',
        phone: '+233241234567',
        role: Role.FARMER,
        name: null,
        locale: 'en',
        isVerified: true,
        momoProvider: null,
        momoPhone: null,
        momoAccountName: null,
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ status: 'ok', db: true, redis: true }) }),
    );
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
    vi.unstubAllGlobals();
  });

  it('shows the logged-in farmer role and a healthy API status', async () => {
    renderProfile();

    expect(screen.getByText('Farmer')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('API connected')).toBeInTheDocument());
  });

  it('pre-fills the MoMo form with the farmer\'s already-saved details, not a blank form', async () => {
    useAuthStore.getState().setSession({
      user: {
        id: 'user_1',
        phone: '+233241234567',
        role: Role.FARMER,
        name: null,
        locale: 'en',
        isVerified: true,
        momoProvider: MomoProvider.TELECEL,
        momoPhone: '+233241234567',
        momoAccountName: 'Kwame Mensah',
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    renderProfile();

    expect(await screen.findByDisplayValue('241234567')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Kwame Mensah')).toBeInTheDocument();
  });
});
