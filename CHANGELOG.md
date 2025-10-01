# Changelog

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
