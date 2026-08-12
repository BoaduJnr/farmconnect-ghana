#!/usr/bin/env bash
# Vercel install step for the web PWA build.
#
# npm ci at the repo root has been observed to silently under-install apps/web's
# own regular dependencies (react, axios, etc.) specifically on Vercel's Linux
# build containers - reproduced across three different Node/npm version
# combinations, not reproducible locally. Root cause unconfirmed (matches a
# longstanding, unresolved class of npm workspaces bugs - see npm/cli#3339,
# #3609, #4471, #7137). As a reliable workaround, after the normal install we
# explicitly force-install apps/web's own dependency list directly - CLI-specified
# package installs are a different, more direct npm code path than the tree
# discovery/reconciliation that appears to be failing.
set -euo pipefail

npm ci --include=dev

cd apps/web

npm install --no-save --include=dev \
  "react@^18.3.1" \
  "react-dom@^18.3.1" \
  "react-router-dom@^6.28.0" \
  "@tanstack/react-query@^5.59.20" \
  "axios@^1.7.7" \
  "i18next@^23.16.4" \
  "react-i18next@^15.1.1" \
  "zustand@^5.0.1" \
  "@testing-library/jest-dom@^6.6.2" \
  "@testing-library/react@^16.0.1" \
  "@types/react@^18.3.12" \
  "@types/react-dom@^18.3.1" \
  "@vitejs/plugin-react@^4.3.3" \
  "autoprefixer@^10.4.20" \
  "jsdom@^25.0.1" \
  "postcss@^8.4.47" \
  "tailwindcss@^3.4.14" \
  "typescript@^5.6.3" \
  "vite@^5.4.10" \
  "vite-plugin-pwa@^0.20.5" \
  "vitest@^2.1.4"
