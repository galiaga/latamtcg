# Changelog

## v0.11.0 — 2025-10-02
### Features
- Theming overhaul (Light as default with lilac palette):
  - Light canvas is now soft lilac with subtle vertical gradient; tokens for bg, card, border, ring, shadows, chips updated.
  - White cards on lilac canvas with lilac borders and shadows; contrast meets WCAG AA.
  - Profile dropdown reworked to tokenized surfaces (no hardcoded black/white), proper hover and focus ring.
  - No regressions in Dark mode; user choice persists via localStorage, applied before paint.
- Printing page “See other printings” carousel:
  - Horizontal, scroll‑snap carousel with mini‑thumbnails, set/name text, finish chips, and price.
  - Arrow controls with keyboard support, gradient overflow hints, lazy thumbnails with srcSet.
  - Drag/scroll with mouse and touch; links protected against accidental clicks during drags.

### Performance
- Cart: single‑fetch per route + fast responses
  - Added CartProvider with SWR (dedupe + S‑W‑R); header consumes shared state.
  - `/api/cart` emits ETag and private cache headers; returns 304 on If‑None‑Match.
  - Server dedupe with `react.cache()` for `getOrCreateUserCart`.
  - Logs `cart.ms` latency metric.
- Search: server cache and metrics
  - `/api/search` caches responses by query key (Redis if present, memory otherwise) with TTL 5m.
  - Cache‑hit logging; existing service logs `search.perf` with `db_items_ms` and `db_facets_ms`.
- Printing page: caching + metrics
  - `getPrintingById` wrapped in `react.cache()`; page segment sets `revalidate = 300`.
  - Logs `printing.ms` per render.
- Health/Perf endpoint
  - `/api/health/perf` summarizes recent timing samples (p50/p95) for quick checks.

### Fixes
- Resolved client/server boundary errors by moving interactive carousel logic into a client component.
- Fixed Decimal serialization to Client Components (normalize to numbers/strings before props).
- Eliminated duplicate Prisma import/redeclaration in `lib/cart.ts`.

### Refactors / Chore
- Token cleanup across chips/popovers/cards; unified shadows via `var(--shadow)`.
- Added SQL notes for indexes/MV under `prisma/migrations/20251002160000_perf_indexes_mv/README.md`.

## v0.10.0 — 2025-10-02
### Features
- Header cart badge and quick access:
  - New `HeaderCart` icon in the global header with a live-updating count.
  - Badge hides when zero and navigates to `/cart` on click.
  - Updates in real time for both guests and logged-in users; listens to `cart:refresh`, `cart:changed`, route changes, window focus, and tab visibility.
- Signed‑in checkout:
  - New endpoint: `POST /api/checkout/user` to create an order for authenticated users and mark their cart as checked out.
  - Cart page now shows “Checkout” when signed in (and keeps “Checkout as guest” when logged out).
  - Reliable redirect to `/order/confirmation?orderId=…` with a fallback hard navigation and a busy state.
- Search autocomplete UX:
  - Floating, portal‑based panel positioned below the search bar that never overlaps the filter bar.
  - Closes on submit, route change, outside click, scroll, and ESC; full keyboard navigation.

### Fixes
- Cart badge sometimes empty after auth transitions: header now refreshes on route change, focus, and visibility; cart page emits `cart:changed` after mutations.
- Autocomplete panel overlapping filters or persisting after navigation is resolved with portal + positioning and robust close rules.
- User checkout now guarantees redirect to confirmation (push + hard redirect fallback) and triggers a cart refresh.
- Removed `User` upsert from `getOrCreateUserCart` to avoid unnecessary DB writes and P1001 noise during reads.
- `/api/cart` now fails gracefully during transient DB issues (returns empty cart instead of 500).

### Performance / Runtime
- Prisma hardening:
  - `datasource db` now supports `directUrl` (for non‑pooled operations) in `schema.prisma`.
  - Prisma singleton includes a guard for `DATABASE_URL` and pooled connection tuning.
  - All Prisma routes run on Node.js runtime (no Edge): `/api/cart`, `/api/cart/merge`, `/api/checkout/guest`, `/api/auth/me`, `/api/printing/resolve`, `/api/db/health`.
  - Added `/api/db/health` for quick DB reachability checks.
- Client/server boundary:
  - Moved printing id resolution out of the client to a server API (`/api/printing/resolve`) so client bundles never import Prisma.

### Refactors / Chore
- Minor layout tweaks to integrate `HeaderCart` next to the user menu.

## v0.9.0 — 2025-10-02
### Features
- Cart and Auth integration:
  - Cart is now associated with the authenticated user when logged in.
  - Guest cart items are merged into the user cart on login/signup (duplicates coalesced; quantities summed).
  - Logout now fully resets cart state: clears guest cart and `cart_token` cookie.
  - New endpoint: `POST /api/cart/reset` to clear guest cart and cookie.
  - API prioritizes the authenticated user cart in `GET /api/cart`, `POST /api/cart/add`, and `POST /api/cart/update`.
- Auth callback hardening:
  - Reliable PKCE code exchange in callback; avoids duplicate exchange attempts and noisy logs.

### Fixes
- Prevent FK violation by upserting `User` before creating a user cart.
- Ensure `cart_token` cookie is cleared after merging anonymous cart into user cart.

### Refactors / Chore / Docs
- Update changelog and bump app version.

## v0.8.0 — 2025-10-02
### Features
- Cart (v0) visible experience:
  - Add "Add to cart" buttons on search results and printing pages.
  - API: POST `/api/cart/add`, GET `/api/cart`, POST `/api/cart/update` to create/fetch/update cart lines.
  - New client `/cart` page: lists items with quantity +/− controls, remove; shows subtotal and total; includes "Checkout as guest" button.
  - Guest checkout: collects email, calls POST `/api/checkout/guest`, and on success redirects to `/order/confirmation?orderId=…`.
  - Order confirmation `/order/confirmation`: displays order id, date, total; shows "Create my account" (magic link) banner when logged out.

### Fixes
- Build/runtime: resolve `next/dynamic` usage issues by removing duplicate imports and avoiding `ssr: false` in Server Components; import client components directly where required.

## v0.7.1 — 2025-10-02
### Features
- Authentication UI (v0):
  - New `/auth` page with **Continue with Google** and **Email magic link** options.
  - Auto-redirects to `/orders` on successful login or if a session already exists.
  - Global header updates: shows **Sign in** link when logged out, or a user menu with **Orders** and **Sign out** when logged in.
  - On `SIGNED_IN`, calls `/api/cart/merge` to consolidate anonymous cart with user cart and refreshes cart badge.

### Fixes
- Ensure Supabase client properly configured for browser usage with PKCE (single exchange).
- Verified login/logout flows work with both Google OAuth and Magic Link.


## v0.7.0 — 2025-10-01
### Features
- Basic User Management (v0):
  - Database: add `User`, `Profile`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Address` models with relations (user-linked carts/orders; anonymous cart via token; orders store email when guest).
  - Auth: Supabase SSR helpers and middleware; `/api/auth/me` to report login state.
  - Cart merge: `/api/cart/merge` merges anonymous cookie cart into the user cart on login.
  - Guest checkout: `/api/checkout/guest` creates an order for guests (stores email, snapshots prices, clears cart cookie).
  - Orders page: `/orders` shows past orders for logged-in users.

### Fixes
- Auth hardening: if Supabase env vars are missing, session checks fail closed (treated as logged out) instead of throwing.
- Checkout: respond `409 { error: 'pricing_unavailable' }` if any item lacks a resolvable price; use `Prisma.Decimal` consistently.
- API auth propagation: routes now derive identity via server-side session instead of custom headers.

### Performance / Build / Runtime
- Next.js prerender safety: wrap client components using `next/navigation` hooks in Suspense; add `SafeClient` helper; fix `/404` and `/mtg` CSR bailout issues.
- Build stability: add local type shims for `stream-json`; mark Scryfall ingest as server-only and use dynamic import in API; fallback to Webpack build to avoid Turbopack client manifest issues.
- Path alias cleanup and minor typing fixes across search services.

### Refactors / Chore / Docs
- Prisma schema and migration added for user/cart/order models.
- Documented which user flows are stubbed vs complete in comments.

## v0.6.2 — 2025-10-01
### Fixes
- Search: Results now display the full set name (e.g., “Limited Edition Alpha”) instead of the short code (e.g., “LEA”). Collector number is still shown when available (e.g., “#292”).

### Refactors / Chore / Docs
- Grouped search coalesces `setName` from the normalized `Set` table to guarantee a user-friendly name without affecting sorting, filtering, or pagination.

## v0.6.1 — 2025-10-01
### Fixes
- Search: Price sorting is now applied globally across the full result set before pagination (High → Low uses max price; Low → High uses min price). Resolves cases where higher-priced items appeared below cheaper ones.
- Search: Representative printing selection now matches the global price metric so the displayed price aligns with the ordering.

### Refactors / Chore / Docs
- Update changelog for global price sort behavior.

## v0.6.0 — 2025-09-30
### Features
- Search: Sort by Price (Low → High, High → Low); compact selector in results toolbar; persists `?sort=` in URL and preserves filters/pagination.
- Type-safe `SortOption` and shared parser for strict validation across SSR/API.

### Fixes
- Price ordering treats `NULL`/`0` as unknown and places them after priced items; stable within groups.
- Representative printing now aligns with the price used for ordering (no mismatched thumbnails like $93/$101 out of sequence).
- Prevent extra empty pages by returning an accurate `totalResults` on terminal pages when `hasMore` is false.
- Hardened ORDER BY assembly to avoid SQL "syntax error near LIMIT" in conditional sorts.

### Performance
- Sorting applied server-side in SQL before pagination; still single round-trip.
- Added partial btree indexes on `MtgCard` price columns (`priceUsd`, `priceUsdFoil`, `priceUsdEtched`) for common filter path.
- Lightweight telemetry: logs sort option and counts for sanity checks.

### Refactors / Chore / Docs
- Centralized sort parsing in `src/search/sort.ts`; wired through `/api/search` and `/mtg/search` SSR.
- Moved Sort control to the right of the toolbar after “Clear Filters” with an accessible “Sort by:” label.
- Minimal integration tests for `price_asc`/`price_desc`, including null placement.

## v0.5.0 — 2025-09-30
### Features
- Normalize MTG sets into `Set` table with FK from `MtgCard.setCode` (a1b2c3)
- Paper-only enforcement: purge non-paper and add CHECK constraint; admin sanitize script (b2c3d4)
- Compute card image URLs from `scryfallId` via helper; remove stored image URL (c3d4e5)

### Fixes
- Remove `setName` column usage; update queries and pages to join/use normalized set or index (d4e5f6)
- Fix Next.js 15 `searchParams` usage by awaiting on server pages (e5f6a7)
- Resolve empty-array SQL error in grouped search (42P18) (f6a7b8)
- Avoid Redis import errors when REDIS_URL absent with guarded dynamic import (a7b8c9)
- Restore Set Name in Printing page breadcrumb by joining `Set` on the server; falls back to set code when missing; no extra client requests or schema changes.

### Performance
- Add GIN/partial indexes on `MtgCard` (trigram name, finishes, composite filtered, oracleId) and ANALYZE (b8c9d0)
- Drop blocking COUNT; use pageSize+1 pagination with nextPageToken (c9d0e1)
- Lazy facets with cache; items return immediately (d0e1f2)
- Background total estimator via EXPLAIN JSON, cached; optimistic pagination shows pages up front (e1f2a3)

### Refactors / Chore / Docs
- Prisma schema updates for `Set` model and relations; new migrations (f2a3b4)
- Update ingest and copy pipelines to stop persisting image URL and set name (a3b4c5)
- Search index rebuild to compute image URL on the fly (b4c5d6)
- Scripts: `db:sanitize-paper-only`, `db:analyze`, `db:verify-set-normalization` (c5d6e7)


## v0.4.0 — 2025-09-25

### Features
- feat: marketplace filters with chip-based facets, popovers, numbered pagination, rounded pricing; search API multi-set; printing page price (1743aa9)

## v0.3.0 — 2025-09-25
### Features
- Marketplace-style filter UX with horizontal chip bar and facet popovers (Sets, Rarity, Printings)
- Multi-select facets with live counts and URL-sync; instant results update
- Sets facet shows full set names; options hidden when count is zero
- Numbered pagination (compact with ellipsis), accessible and branded
- Search API: multi-select `set` support (`?set=AAA&set=BBB`), richer grouped results
- Search index: support “Shattered Glass” variant

### Fixes
- Facet overlays no longer push layout; only one facet open at a time; reliable outside-click/Escape to close
- Image fallback added for broken thumbnails
- Search SQL: ensure `rarity` available in lateral selection; remove results without backing card rows

### Performance
- Next/Image sizing and intrinsic ratios to reduce CLS; lazy-loaded thumbs
- Prefetch next page link for snappier pagination

### Refactors / Chore / Docs
- Removed “All Filters” and grouping checkbox; simplified UI
- Consolidated pagination controls and reduced vertical spacing
- Rounded, token-aligned chips and popover components
- Release plumbing and safeguards for meaningful tags

Changes to pricing display:
- Prices are now whole-dollar (rounded up) across grid and printing detail pages, with fallback order Etched → Foil → Normal.

## v0.2.0 — 2025-09-25
### Features
- ui: product-style card page layout with sticky image column and 63:88 aspect; compact header with left title and inline search (0041fa4)
- search: grouped results, pagination (25/page), price display; render (Borderless) instead of (Full Art) across UI (0041fa4)

### Performance
- image: Next/Image size hints and aspect wrappers to prevent CLS (0041fa4)

### Refactors / Chore / Docs
- card-page: reuse SearchResultsGrid to unify card listing UI (0041fa4)
- cleanup: remove dead code and unused imports; normalize formatting (no behavior change) (7d717ae)

## v0.1.2 — 2025-09-24
- chore(release): bump version and update changelog

## v0.1.1 — 2025-09-24
- Search: canonical printing routing `/mtg/printing/[printingId]`, robust data fetch, and breadcrumb.
- SearchBox: printing links with guards and dev fallback; grouped card links; tokenized UI.
- Indexing: ensured docs have `id` = scryfallId; rebuild/audit scripts added.
- Theming: semantic tokens, pre-paint init, ThemeToggle; tokenized tables/buttons/inputs.
- Config: redirect legacy pretty route to canonical; health endpoint.
- UI: printing detail page, oracle page tweaks, image component to enforce 3:4 aspect.
