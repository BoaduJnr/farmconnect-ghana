# FarmConnect Ghana

A mobile-first PWA connecting Ghanaian smallholder farmers directly to buyers, live market prices,
and AI-powered agricultural advisory — a University of Ghana capstone project (Group "Angry Nerds").

This repo implements the system described in the project SRS (`../uploads/FarmConnect_Ghana_SRS_Angry_Nerds.docx`),
with a few deliberate departures agreed on during planning:

- **Payments are not gateway-integrated at all.** A farmer registers their Mobile Money number,
  network (MTN/Telecel/AirtelTigo), and registered account name. A buyer sees those details on
  checkout, sends the money directly via their own phone (outside the app), then submits a
  transaction ID for the farmer to manually confirm against their own Mobile Money history. No
  Paystack, no MoMo API integration, no automated charge/transfer — see **Payments** below.
- **Market prices** are served by our own `PriceFeed` service with a realistic seeded dataset — no
  public Ghana Commodity Exchange API actually exists to integrate with.
- The frontend is a **plain React web PWA** (Vite + React + TypeScript), not literally "React Native",
  despite the SRS's phrasing — this gives a real installable/offline PWA without native tooling.
- **The AI advisory chatbot runs on Google Gemini, not Claude/Anthropic.** Gemini has a genuinely
  free developer-side API tier (no credit card, no per-end-user account scheme); it fits a chatbot
  used by many farmers/buyers far better than alternatives that push the AI cost or a login
  requirement onto each end user.

The `FarmConnect Ghana.dc.html` prototype one directory up is a UX/flow/copy reference only — screen
names, i18n keys, and the design palette are borrowed from it; nothing there is pixel-matched.

## Status: Phase 7 (offline caching, full i18n pass, accessibility pass) done

Auth, listings, and the full order lifecycle are live end-to-end using **manual Mobile Money
reconciliation instead of a payment gateway**:

1. A farmer must link Mobile Money details (network, number, registered account name) as a forced
   step right after picking the Farmer role — before they can publish any listing.
2. A buyer orders a listing, sees the farmer's Mobile Money details on the payment screen, and
   sends the money directly via their own phone (MoMo app/USSD, outside FarmConnect).
3. The buyer submits the transaction ID (+ the number they paid from) — order moves to
   `payment_submitted`.
4. The farmer checks that transaction ID against their own Mobile Money SMS/history and either
   **confirms** (`paid`) or **rejects** it (`payment_rejected`, with an optional note — the buyer
   can then resubmit).
5. The buyer confirms delivery once they've received the produce (`delivered`), which marks the
   listing `SOLD`.

Co-ops, admin/moderation, and ratings (Phase 6) are also live end-to-end — see that section below.
Every roadmap phase is now done — see **PWA, i18n, and accessibility (Phase 7)** below and
**Roadmap** for the full history.

## Live prices, notifications, and SMS fallback (Phase 5)

- **Prices** (`GET /api/prices`) — every crop's current price + % change vs. the previous
  snapshot, seeded on boot and nudged ±3% every 5 minutes by a `setInterval` tick
  (`prices.service.ts`). This is a genuinely simulated feed, not literally faked in the API/UI
  layer — there's no public GCX API to poll, matching the departure noted at the top of this file.
  Shown on a new **Prices** tab in the bottom nav (both roles).
- **Notifications** — an in-app `Notification` row is created on every order-state transition
  (payment submitted/confirmed/rejected, delivery confirmed), plus a best-effort SMS to the
  relevant party's phone (failure to send SMS never blocks the transition itself). Surfaced via a
  bell icon (unread-count badge) on every tab-root screen, backed by `GET/POST /api/notifications`.
- **SMS fallback** (`POST /api/sms/inbound`, wired for Africa's Talking's inbound webhook) — a
  fixed command grammar (`HELP`, `REG <name>`, `MOMO <network> <phone>`,
  `LIST <crop> <qtyKg> <priceKg> <region>`, `PRICE <crop>`, `ORDERS`, `CONFIRM <orderId>`) lets a
  feature-phone farmer register, link Mobile Money, list produce, check prices, and confirm
  payments with no app and no OTP round-trip — phone-number possession is treated as identity, the
  same trust boundary basic Mobile Money already relies on. Every inbound message is logged to
  `SmsInboundLog` for audit.

### Two different SMS providers, on purpose

Outbound and inbound SMS are split across two providers, because no single provider we evaluated
does both well for this app:

- **Outbound** (OTP codes, order notifications, replies to inbound SMS commands) — **GiantSMS**
  (`notifications/sms.service.ts`), a Ghana-based gateway. Configured via `GIANTSMS_API_TOKEN` /
  `GIANTSMS_SENDER_ID`; with no credentials set, sends log to the console instead (dev fallback,
  same pattern as the Paystack/Africa's Talking-era code in earlier phases).
- **Inbound** (the SMS command gateway above) — **Africa's Talking**. GiantSMS's public API is
  send-only (no webhook/callback for receiving a text), so the inbound side stays on a provider
  that supports it. This needs no API key in our env at all — `POST /api/sms/inbound` is just a
  public webhook endpoint; Africa's Talking is configured entirely on *their* dashboard to POST
  incoming texts to that URL.

## AI Advisory Chatbot (Google Gemini)

A single ongoing conversation per user (`ChatMessage`, no separate "session" concept), reachable
from the bottom nav ("Advisor") on the buyer role, and from a quick-action card on the farmer home
screen (the farmer bottom nav has Home/Listings/Orders/Prices/Profile instead — no separate Advisor
tab, since the quick-action card already covers it). Two capabilities, one model
(`gemini-flash-latest` — Google's forward-compatible alias rather than a dated version like
`gemini-2.5-flash`, which Google has already started retiring for new API keys/projects; chosen for
speed + free-tier headroom + vision support):

- **Text advice** — crop/pest/weather/market-timing questions, answered in whichever language the
  user writes in (English or Twi). If the buyer/farmer's device location is available, current
  weather (OpenWeatherMap, Redis-cached ~45 min) is folded into the system prompt as context.
- **Photo-based pest ID** — upload a photo of a crop/pest; the image is resized (`sharp`) before
  being sent to Gemini for a vision-based read, and the resized photo itself is saved and shown in
  the chat history.

`GEMINI_API_KEY` and `WEATHER_API_KEY` are blank by default. Unlike the SMS/Paystack-era dev
fallbacks in earlier phases, there's no meaningful way to "simulate" an AI response — so with no
Gemini key configured, the advisor **fails loudly** (`503 "The AI advisor is not configured yet"`)
rather than faking a reply. Weather context degrades more gracefully: if `WEATHER_API_KEY` is
missing or the lookup fails, the chatbot still answers, just without weather grounding.

Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (Gemini, no
credit card) and [home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys)
(weather, free tier).

## Payments (manual Mobile Money)

There is no payment gateway and no escrow — FarmConnect never touches the money. The `Order` row
snapshots the seller's momo provider/phone/account name at creation time (so it stays correct even
if the farmer edits their details later), and the buyer's submitted momo phone + transaction ID are
stored for the farmer to check by hand. The order status machine is:

```
pending → payment_submitted → paid → delivered
payment_submitted → payment_rejected → payment_submitted   (buyer can resubmit)
payment_rejected → disputed → paid | cancelled             (buyer disputes, admin resolves — Phase 6)
pending → cancelled                                        (buyer backs out before paying)
```

A farmer can't publish a listing until Mobile Money details are linked (enforced both by a forced
onboarding screen and, defensively, by the API itself).

## Co-ops, admin/moderation, and ratings & trust (Phase 6)

The SRS is thin on all three of these (one FR sentence each — FR-08 ratings, FR-10 co-ops, FR-13
admin — with no data model, workflow, or UI spec beyond that), so most of the design below is a
judgment call made to fit the app's actual architecture, not something dictated by the SRS text.

- **Ratings & trust (FR-08)** — after an order reaches `delivered`, both buyer and farmer can rate
  each other 1-5 stars (+ optional comment) via `POST /api/ratings/order/:orderId`, one rating per
  (order, rater). A rating recomputes the rated user's `trustScore` (simple average) and
  `ratingCount` in the same transaction as the insert, so the two numbers never drift apart. Trust
  score, rating count, and a `isVerified` badge are shown on marketplace cards and listing detail
  (buyers see this before ordering, matching the SRS's UC-02).
- **Co-op groups (FR-10)** — deliberately scoped down to what a capstone-scale app needs: a farmer
  belongs to at most one co-op at a time, created or joined via a short shareable code (no approval
  workflow). A listing can optionally be attributed to the farmer's co-op (`sellAsCoop` at
  creation), showing the co-op's name on marketplace/listing cards instead of inventing a separate
  bulk-order/joint-negotiation subsystem the SRS never specifies. Leaving a co-op promotes the
  earliest-joined remaining member to leader, or dissolves the co-op if the leader was the sole
  member. Managed from Profile → "My Co-op" (farmers only).
- **Admin & moderation (FR-13)** — a real `ADMIN` role (already reserved in the `Role` enum from
  Phase 0) can verify/suspend user accounts, force a listing's status (moderate fraudulent
  listings), and resolve payment disputes. **There is no self-service admin signup** — the public
  role-selection endpoint only ever accepts FARMER/BUYER — so admins are seeded directly:
  ```bash
  npm run prisma:seed -w @farmconnect/api -- --phone 0241234567 --name "Ama Admin"
  ```
  An admin then logs in exactly like everyone else (phone + OTP); the seed just pre-creates the
  `User` row with `role: ADMIN`. A suspended account is blocked from logging in or refreshing its
  session (`403`) — existing access tokens just expire naturally rather than being revoked
  mid-flight, a deliberate trade-off against adding a DB round-trip to every authenticated request.
  The admin portal lives at `/admin/users`, `/admin/listings`, `/admin/disputes` — a separate, plain
  layout (no bottom nav) gated by role, since the SRS names an "Admin Portal" in its architecture
  diagram but never specifies its screens.
- **Payment disputes** — the SRS's FR-05/UC-03 describe automatic MoMo-gateway escrow release,
  which this app doesn't have (see **Payments** above); FR-13's "resolve disputes raised between
  transacting parties" is the only textual hook for what happens when a buyer insists they paid and
  the farmer disputes it. This app's answer: a buyer can dispute a `payment_rejected` order
  (`POST /api/orders/:id/dispute`), moving it to `disputed`; an admin then resolves it
  (`POST /api/admin/orders/:id/resolve-dispute`) either **upholding the payment** (order becomes
  `paid`) or **upholding the rejection** (order becomes `cancelled`, listing reopens) — both sides
  get notified either way.

## PWA, i18n, and accessibility (Phase 7)

- **Offline caching** — Workbox runtime caching (`vite.config.ts`) is layered on top of the
  precached app shell: `NetworkFirst` (4s timeout, 1-day expiry) for listings/prices/orders/
  notifications/ratings/co-ops/advisory-history GET requests, and `CacheFirst` (30-day expiry)
  for uploaded photos. Matching is by URL *pathname* only, so it works regardless of which host
  `VITE_API_URL` points at. A farmer/buyer with a live connection always sees fresh data; on a
  poor or dropped connection, the last-seen cached copy is served instead of an error — the
  "browse what you already saw" experience the SRS's low-connectivity rural use case needs.
  Mutations (POST/PATCH/DELETE) are never intercepted, only GETs. An `OfflineBanner`
  (`useOnlineStatus` hook, `navigator.onLine` + online/offline events) shows on every tab-root
  screen when the device goes offline, so cached data is never mistaken for live data.
- **Full i18n pass** — every remaining hardcoded English string in farmer/buyer-facing screens
  (added across Phases 5-6 without translation) now routes through `t()`, with matching Twi
  entries added. `document.documentElement.lang` now syncs to the active language on switch
  (`i18n/index.ts`), so assistive tech announces content in the right language. The **admin
  portal** (`/admin/*`) is a deliberate exception — it's an internal staff tool, not part of the
  farmer/buyer-facing product the SRS's bilingual requirement targets, so it stays English-only.
  Mobile Money brand/product names (MTN MoMo, Telecel Cash, AirtelTigo Money) are also left
  untranslated, same as any other proper noun.
- **Accessibility pass** — icon-only buttons (back chevrons, photo attach/send, notification
  bell) now carry `aria-label`s; content-bearing photos (chat attachments, listing uploads) have
  descriptive `alt` text instead of `alt=""`; form inputs are associated with their labels via
  `htmlFor`/`id` (or `aria-label` where no visible label exists, e.g. the 6 individual OTP-digit
  inputs); and every text input/textarea that previously suppressed its focus outline
  (`outline-none` with no replacement) now shows a visible focus state (`focus:border-brand` for
  bordered inputs, `focus-within:ring-2`/`focus-within:border-brand` for compound
  icon-plus-input rows) — keyboard navigation was previously invisible on most forms.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript, Tailwind CSS, i18next (EN/Twi), vite-plugin-pwa |
| Backend | Express + TypeScript, Prisma (Postgres), ioredis |
| Data | PostgreSQL 16, Redis 7 (via Docker Compose) |
| Monorepo | npm workspaces (`apps/web`, `apps/api`, `packages/shared`) |

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres + Redis)

## Getting started

```bash
# 1. Start Postgres + Redis
npm run docker:up

# 2. Copy env template and fill in real secrets
cp .env.example .env
# then edit .env — DATABASE_URL/REDIS_URL already match docker-compose defaults,
# fill in GEMINI_API_KEY / WEATHER_API_KEY / GIANTSMS_* / JWT secrets
# (no payment provider keys needed — see "Payments" above)

# 3. Install dependencies (root — installs all workspaces)
npm install

# 4. Apply database migrations
npm run prisma:migrate -w @farmconnect/api

# 5. Run both apps in dev mode
npm run dev
```

- API: http://localhost:4000 (`GET /health` for a liveness/dependency check)
- Web: http://localhost:5173

## Repo layout

```
apps/
  web/       Vite + React PWA
  api/       Express + TypeScript API
packages/
  shared/    Cross-cutting enums (Role, OrderStatus, ListingStatus, DisputeResolution...) + zod schemas
infra/
  docker-compose.yml   Postgres + Redis for local dev
```

## Common scripts (run from repo root)

| Command | Description |
|---|---|
| `npm run dev` | Run api + web concurrently |
| `npm run build` | Build shared → api → web |
| `npm test` | Run tests in api + web |
| `npm run lint` | Lint all workspaces |
| `npm run docker:up` / `docker:down` | Start/stop Postgres + Redis |
| `npm run prisma:migrate -w @farmconnect/api` | Apply Prisma migrations |
| `npm run prisma:studio -w @farmconnect/api` | Open Prisma Studio |

## Roadmap

Building phase by phase, each landing frontend + backend together:

- [x] **Phase 0** — Scaffolding
- [x] **Phase 1** — Auth: phone + OTP (SMS via GiantSMS), role selection, JWT sessions
- [x] **Phase 2** — Produce listings + buyer marketplace search/filter
- [x] **Phase 3** — Orders + manual Mobile Money reconciliation
- [x] **Phase 4** — AI advisory chatbot (Gemini, incl. photo-based pest ID) + weather context
- [x] **Phase 5** — Live price feed, notifications, SMS fallback commands
- [x] **Phase 6** — Co-op groups, admin/moderation, ratings & trust scores
- [x] **Phase 7** — PWA offline caching, full i18n pass, accessibility pass (this state)

All seven planned phases are complete.
