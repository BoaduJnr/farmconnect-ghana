import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import './i18n';
import { useAuthStore } from './store/authStore';

describe('App routing', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    window.history.pushState({}, '', '/');
  });

  it('shows the onboarding screen at "/" when logged out', () => {
    render(<App />);
    expect(screen.getByText('Sell smarter. Earn fairer.')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });
});
