import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Load the single root .env (shared with apps/api) instead of apps/web/.env.
  envDir: '../../',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'FarmConnect Ghana',
        short_name: 'FarmConnect',
        description:
          'A mobile-first marketplace connecting Ghanaian smallholder farmers to buyers, market prices, and agricultural advisory services.',
        theme_color: '#1B7A3D',
        background_color: '#F4F7F2',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Runtime caching for API calls (Phase 7) — matched by pathname alone so it works
        // regardless of the API's origin (VITE_API_URL may point at a different host/port
        // than the web app itself). Only GET requests are ever intercepted by Workbox, so
        // mutations (POST/PATCH/DELETE) always hit the network untouched.
        runtimeCaching: [
          {
            // Read-heavy, changes-somewhat-often data: listings, prices, orders,
            // notifications, ratings, co-op membership, chat history. NetworkFirst means a
            // farmer/buyer with a live connection always sees fresh data; a short timeout
            // falls back to the last-seen cached copy when offline or on a poor connection —
            // exactly the "browse what you already saw" experience the SRS wants for
            // low-connectivity rural use, without ever showing stale data when online.
            urlPattern: ({ url }) =>
              /^\/api\/(listings|prices|orders|notifications|ratings|coops|advisory\/messages)(\/|$)/.test(
                url.pathname,
              ),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'farmconnect-api-cache',
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
            },
          },
          {
            // Listing/chat photos rarely change once uploaded — safe to cache aggressively.
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'farmconnect-uploads-cache',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5173,
    // Lets the Vite dev server accept requests forwarded through a Cloudflare Tunnel
    // (trycloudflare.com), which Vite's host-header check would otherwise reject.
    allowedHosts: ['.trycloudflare.com'],
  },
});
