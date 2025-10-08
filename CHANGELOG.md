# Changelog

## v0.17.0 — 2025-01-27
### Infrastructure & Reliability
- **Horizontal Scaling Infrastructure**: Complete production-ready scaling implementation
  - Enhanced cache adapter with unified interface (`get`, `set`, `getSWR`, `withLock`)
  - Redis/Memory driver toggle via `CACHE_DRIVER` environment variable
  - Centralized cache key builder with query normalization (lowercase, unaccent, sorted)
  - Stale-while-revalidate caching for improved performance
- **Health Monitoring & Metrics**:
  - Added `/api/health` endpoint with fast path and deep validation modes
  - Implemented comprehensive metrics collection (P50/P95 latencies, error rates)
  - Metrics flushed every 30s as structured JSON logs for observability
  - Applied monitoring to `/api/search` and `/api/search/suggestions` endpoints
- **Database Pool Safeguards**:
  - Configurable connection pool sizing (10 dev, 20 prod via `DB_POOL_SIZE`)
  - Added connection, statement, and transaction timeouts (30s, 60s, 30s)
  - Enhanced Prisma client configuration for production scaling
- **Load Testing Infrastructure**:
  - Comprehensive k6 performance testing scripts (`scripts/load-test.js`)
  - Artillery alternative configuration (`scripts/load-test.yml`)
  - Performance thresholds: P95 API < 200ms, SSR < 400ms, errors < 0.5%

### Technical Improvements
- **Cache Architecture**:
  - Unified cache key generation across SSR and client-side components
  - Consistent parameter ordering and normalization for cache hit optimization
  - Legacy compatibility maintained while introducing enhanced interface
- **Stateless Server Verification**:
  - Confirmed stateless architecture with Supabase cookie-based sessions
  - Verified cart state persistence in PostgreSQL with anonymous tokens
  - Validated ephemeral file processing (no permanent local storage)
- **Next.js 15 Compliance**:
  - Verified proper `await searchParams` usage across all page components
  - Confirmed SSR/client hydration optimization prevents duplicate API calls
  - Maintained backward compatibility with existing search functionality

### Documentation & Configuration
- **Environment Variables**: Added scaling configuration options
  - `CACHE_DRIVER`: Memory/Redis adapter selection
  - `REDIS_URL`: Distributed caching configuration
  - `DB_POOL_SIZE`: Database connection pool sizing
- **Performance Monitoring**: Comprehensive health check and metrics documentation
- **Load Testing**: Automated performance validation with clear thresholds
- **Infrastructure Checklist**: Complete phase tracking and implementation status

## v0.16.0 — 2025-01-27
### Features
- Enhanced search suggestions system:
  - Implemented Starts-With priority search logic with intelligent fallbacks (Exact → Starts-With → Contains → Fuzzy)
  - Added comprehensive variant suffix display in suggestions (e.g., "Ancient Tomb (Galaxy Foil) (Borderless)")
  - Improved search ranking to prioritize exact matches and word-prefix matches
  - Added dedicated `/api/search/suggestions` endpoint with optimized caching (30min TTL)
  - Enhanced suggestions dropdown with compact, consistent height (~280px) and proper scrolling
- Advanced filter system improvements:
  - Added "Show unavailable items" filter option with proper URL parameter handling
  - Implemented comprehensive loading indicators across all filter controls (Sets, Rarity, Printings, Clear Filters, Sort)
  - Enhanced Clear Filters functionality to reset all filter parameters including showUnavailable
  - Added visual feedback with spinners and disabled states during filter operations

### Fixes
- Search suggestions UX improvements:
  - Fixed suggestions not appearing due to incorrect API endpoint usage
  - Resolved suggestions dropdown height issues on search results page
  - Eliminated suggestions flickering when typing on search results page
  - Prevented suggestions from showing when search box gets auto-focused after navigation
  - Fixed suggestions appearing briefly when navigating to search results page
- Search functionality enhancements:
  - Unified search behavior across the entire app with Starts-With priority system
  - Improved search ranking for partial queries (e.g., "jace, the mi" now correctly prioritizes "Jace, The Mind Sculptor")
  - Fixed price sorting to use maximum available price across all finishes (GREATEST function)
  - Resolved pagination issues where total results were artificially limited
  - Fixed filter persistence and pagination consistency across different pages
- Database and performance optimizations:
  - Added composite indexes for improved search performance (GIN and B-tree indexes)
  - Enhanced SQL query structure with proper column qualification to avoid ambiguity errors
  - Improved fallback search logic with sequential stages for comprehensive results
  - Optimized suggestion caching with granular cache keys and longer TTL

### Technical Improvements
- Search query processing:
  - Implemented word boundary matching using PostgreSQL regex (`~* '\\m'`) for precise Starts-With matching
  - Added query normalization with diacritic removal and space collapsing
  - Enhanced AND logic between tokens for more accurate multi-word searches
  - Improved exact match detection for quoted queries and exactOnly parameter
- State management enhancements:
  - Added `isUserTyping` state to distinguish between user input and URL parameter sync
  - Implemented robust focus handling to prevent unwanted suggestion displays
  - Enhanced route change detection to properly close suggestions on navigation
  - Added comprehensive error handling and fallback mechanisms
- UI/UX improvements:
  - Compact suggestion items with consistent height and proper text hierarchy
  - Enhanced loading states with spinners and disabled controls
  - Improved visual feedback for all interactive elements
  - Better responsive design for suggestions dropdown

### Performance
- Optimized suggestion fetching with debounced requests and proper abort handling
- Enhanced caching strategy with more granular cache keys and appropriate TTL values
- Improved database query performance with targeted indexes and optimized SQL structure
- Reduced unnecessary re-renders with better state management and effect dependencies

### Refactors / Chore
- Consolidated search logic into unified `searchQueryGroupedSimple.ts` service
- Removed deprecated `searchQueryGrouped.ts` file
- Enhanced type safety with proper parameter validation and error handling
- Updated all search-related components to use consistent state management patterns
- Added comprehensive error logging and debugging capabilities

## v0.15.1 — 2025-01-27
### Fixes
- Fixed foil variant suffix display logic:
  - Cards now only show foil-related variant suffixes (e.g., "Surge Foil", "Galaxy Foil") when they actually have foil prices available
  - Prevents misleading variant labels that suggest foil availability when no foil price exists
  - Maintains accurate pricing information for users making purchasing decisions
  - Applies to all foil variants including Surge Foil, Galaxy Foil, Double Rainbow, First Place Foil, etc.

### Technical Improvements
- Enhanced search query processing to filter variant suffixes based on price availability
- Improved variant suffix filtering logic with regex-based foil suffix removal
- Maintained performance by filtering at query time rather than requiring search index rebuild
- Preserved search suggestions performance by keeping lightweight SearchIndex approach

## v0.15.0 — 2025-01-27
### Features
- Dynamic variant rendering system for MTG cards:
  - Comprehensive variant tags display (finishes, frame effects, promo types, border color)
  - Consistent formatting across search results, detail pages, and SEO titles
  - Support for curated frame effects (Showcase, Extended Art, Retro Frame, etc.)
  - Dynamic foil variant detection (any promoTypes ending in "foil")
  - Borderless detection from borderColor field
  - Proper ordering: Frame Effects → Foil Variants → Base Finish → Borderless (always last)
- Enhanced search experience:
  - Variant information now appears in search results titles and breadcrumbs
  - Search index includes comprehensive variant suffix field for consistent display
  - Improved search functionality for variant terms (e.g., "fracture foil", "galaxy foil")
- User-friendly empty state:
  - Humorous TCG-themed "No items found" message with helpful search suggestions
  - Generic messaging ready for future games and item types beyond MTG
  - Engaging personality that resonates with the TCG community

### Fixes
- Removed generic "Foil" and "Normal" chips from search results (variant info now in titles)
- Eliminated "(Inverted)" references as users don't care about this frame effect
- Fixed variant suffix ordering to ensure "Borderless" appears last in all combinations
- Resolved search index population to include variantSuffix field end-to-end
- Improved search query to include keywordsText for better variant term matching

### Performance
- Optimized search index rebuild process with comprehensive variant suffix generation
- Enhanced SQL queries with prioritized variant picking for grouped results
- Improved cache busting mechanism for search results after index updates

### Refactors / Chore
- Added comprehensive unit tests for formatCardVariant helper function
- Created integration tests for variantSuffix functionality
- Updated search services to use consistent variant formatting logic
- Enhanced type safety with proper MtgCard interface including borderColor field
- Improved error handling and validation in search index rebuild process

## v0.14.0 — 2025-01-27
### Features
- Enhanced search filtering and pricing system:
  - Merged Price and Printings filters into a single, intuitive "Printings" filter
  - When selecting a printing type (Normal, Foil, Etched), shows only cards with that specific price type available
  - Displays the corresponding price for the selected printing type
  - All printing options remain visible in the dropdown regardless of current selection, allowing multi-selection
  - Price sorting continues to work correctly based on the displayed price
- Improved card detail page pricing display:
  - Shows all available prices (Normal, Foil, Etched) with clear labels
  - Only displays prices for finishes that are actually available for that specific printing
  - Eliminates confusion about non-existent pricing options

### Fixes
- Fixed search bar editability: users can now edit the search term after performing a search
- Resolved pagination accuracy: now shows correct total page count from the start using accurate backend counts
- Fixed sorting by price to use the same price priority as displayed (Normal → Foil → Etched)
- Eliminated Decimal object serialization errors when passing data from Server to Client Components
- Fixed facet calculation to show all available printing types for the current search, not just filtered results

### Performance
- Backend now provides accurate total result counts synchronously for better pagination
- Improved facet calculation efficiency by removing redundant filtering logic
- Enhanced caching strategy for search results and facets

### Refactors / Chore
- Removed redundant Price filter parameter from API endpoints and components
- Updated backend SQL queries to use consistent price display logic
- Consolidated price display logic across search results and card detail pages
- Enhanced type safety for printing availability flags

## v0.13.0 — 2025-10-06
### Features
- Double‑faced/transform cards: front/back support in Search and Printing pages.
  - New in‑grid fade flip with fixed 3:4 image area; no layout shift.
  - Hover to preview back on desktop; tap to toggle on mobile. Prevents navigation.
  - Uses official Scryfall images for both faces; only probes back face when present.

### Fixes
- Prevent Link navigation when flipping within Search results.
- Eliminate 404 spam by probing back images with HEAD before loading.

### Refactors / Chore
- Add helpers for Scryfall front/back URLs; consolidate image handling.

## v0.12.0 — 2025-10-06
### Features
- Cart reactivity & UX
  - Instant, optimistic badge updates for Add/Remove/Set quantity across Search and Cart pages.
  - New fast summary endpoint: `GET /api/cart/summary` returns `{ totalCount, totalPrice }` for lightweight badge refreshes.
  - Header reads exclusively from a shared `CartProvider`; no direct network calls from the header.

### Performance
- Client
  - Debounced, coalesced revalidation (~900ms) after mutations; no revalidate on focus/reconnect for Search/Cart.
  - Click de‑dupe and in‑flight guards in Add to Cart to ensure exactly one POST per click.
- Server
  - Optimized `POST /api/cart/add` to perform a single read + create/increment path and return summary in response.
  - `POST /api/cart/update` now returns `{ totalCount, totalPrice }` for instant reconcile.
  - Both `/api/cart/summary` and mutation endpoints emit `X-Server-Timing` for DB/total durations.

### Fixes
- Eliminated duplicate/looping cart refreshes when idle on Search/Cart; cross‑tab sync now triggers a single debounced summary fetch (no optimistic from storage).
- Fixed header badge lag after removals by sending same‑tab optimistic deltas from the Cart page and reconciling silently.

### Refactors / Chore
- Centralized optimistic reconcile in `CartProvider.addOptimisticThenReconcile` with equality guard and single debounced revalidate.
- Added request id plumbing for idempotent add requests (server records keys to pave the path for full dedupe).

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
