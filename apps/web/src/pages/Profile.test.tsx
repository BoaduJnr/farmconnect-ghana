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

  it('shows the logged-in farmer role, with no System Status section (admin-only)', async () => {
    renderProfile();

    expect(screen.getByText('Farmer')).toBeInTheDocument();
    expect(screen.queryByText('System status')).not.toBeInTheDocument();
    // Give any stray effect a tick to run, then confirm it still never appeared.
    await waitFor(() => expect(screen.getByText('Mobile Money payout details')).toBeInTheDocument());
    expect(screen.queryByText('API connected')).not.toBeInTheDocument();
  });

  it('shows System Status for an admin, labeled correctly (not "Buyer")', async () => {
    useAuthStore.getState().setSession({
      user: {
        id: 'admin_1',
        phone: '+233200000001',
        role: Role.ADMIN,
        name: 'Examiner Admin',
        locale: 'en',
        isVerified: true,
        momoProvider: null,
        momoPhone: null,
        momoAccountName: null,
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    renderProfile();

    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.queryByText('Buyer')).not.toBeInTheDocument();
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
