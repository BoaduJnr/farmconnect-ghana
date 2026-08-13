import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest.config.ts sets globals: false, so @testing-library/react's automatic afterEach(cleanup)
// registration (which detects a *global* afterEach) never fires -- previously-rendered trees
// stay mounted across tests in the same file. Harmless when tests don't share observable state,
// but every component here subscribes to the same authStore singleton, so a later test's
// setSession() reactively re-renders earlier, still-mounted instances too. Register it explicitly.
afterEach(() => {
  cleanup();
});
