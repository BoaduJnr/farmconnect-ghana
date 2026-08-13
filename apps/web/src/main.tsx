import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './i18n';
import './index.css';

// Detects a new deployed version and applies it automatically -- no manual reload needed (see
// vite.config.ts's injectRegister: false comment for why the default script wasn't enough).
// Trades away the "prompt the user before reloading" pattern deliberately: this app's forms
// are short, deploys are infrequent relative to session length, and the ask was for updates to
// just show up. onNeedRefresh fires once the new service worker has finished installing;
// calling updateSW(true) tells it to skip waiting and take over, then reloads the page.
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      // The browser's own update check only fires on navigation and can be many hours apart.
      // Poll more eagerly so a deploy is picked up within a minute of the tab being active,
      // rather than only on the next full page load.
      if (!registration) return;
      setInterval(() => registration.update(), 60 * 1000);
      window.addEventListener('focus', () => registration.update());
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
