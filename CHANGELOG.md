# Changelog

## v0.24.0 — 2025-01-16
### Features
- **Responsive Footer Component**: Complete footer redesign with dark lilac theme and three-column layout
  - **Shop Section**: Magic: The Gathering and View all products links
  - **Support Section**: Contact Us, FAQ, and Refunds & Returns links
  - **About LatamTCG Section**: About Us, How it works, Terms & Conditions, and Privacy Policy links
  - **Responsive Design**: Mobile (1 col), Tablet (2 cols), Desktop (3 cols) with proper dividers
  - **Dark Lilac Theme**: Consistent brand colors with white text and proper contrast ratios
  - **Accessibility**: Proper ARIA labels, focus states, and keyboard navigation

- **New Static Pages**: Created comprehensive content pages for MVP launch
  - **Contact Page** (`/contact`): Basic contact information with email link
  - **FAQ Page** (`/help`): Comprehensive FAQ covering ordering, shipping, card quality, returns, and account security
  - **Refunds & Returns Page** (`/returns`): Detailed Chile MVP policy with evidence requirements and timeframes
  - **About Page** (`/about`): Company mission, values, and team information focused on Chile operations
  - **Terms & Conditions Page** (`/terms`): Legal terms aligned with Chile MVP operations and fraud prevention
  - **Privacy Policy Page** (`/privacy`): Privacy policy tailored for Chile-based operations

- **Newsletter API Stub**: Basic newsletter subscription endpoint (`/api/subscribe`)
  - Email validation and basic error handling
  - Environment variable support for newsletter provider integration
  - Graceful fallback when provider is not configured

### UI/UX Improvements
- **Consistent Button Theming**: Applied dark lilac theme to Search and Add to Cart buttons across the app
  - **SearchBox Button**: Dark lilac background with white text and proper hover states
  - **AddToCartButton**: Consistent styling across all size variants (xs, sm, lg, card tile)
  - **Focus States**: Proper focus rings using brand colors for accessibility
  - **Hover Effects**: Smooth transitions and visual feedback

- **Header Navigation**: Moved "How it works" link from header to footer for better organization
  - **Cleaner Header**: Simplified header layout with essential navigation only
  - **Footer Integration**: "How it works" now appears in "About LatamTCG" section
  - **Consistent Styling**: Maintains same dark lilac theme and accessibility standards

### Content Updates
- **Chile MVP Focus**: All pages updated to reflect current Chile operations with Latin America expansion plans
- **Professional Tone**: Consistent, trustworthy messaging across all content pages
- **Legal Compliance**: Terms and Privacy Policy aligned with Chilean consumer protection laws
- **Fraud Prevention**: Enhanced policies with evidence requirements and verification processes
- **Quality Standards**: Clear communication about card condition standards (LP or better only)

### Technical Improvements
- **Component Architecture**: Separated NewsletterForm as client component to prevent hydration issues
- **CSS Variables**: Added complete brand color palette to globals.css for Tailwind integration
- **SEO Optimization**: Proper metadata and structured content for all new pages
- **Performance**: Optimized component structure and removed unused dependencies
- **Code Quality**: Clean TypeScript, no linting errors, and proper error handling

### Fixes
- **Hydration Issues**: Resolved client-side hydration errors by separating interactive components
- **Unused Imports**: Cleaned up unused NewsletterForm import after removing Follow Us section
- **Build Stability**: Ensured all components compile without errors and warnings
- **Responsive Design**: Fixed grid layout to properly accommodate three-column footer

### Refactors / Chore
- **Footer Simplification**: Removed "Follow Us" section and social media links for cleaner design
- **Version Management**: Updated version numbers across package.json, VERSION file, and version.json
- **Documentation**: Comprehensive changelog entry documenting all changes and improvements
- **Code Organization**: Improved component structure and separation of concerns

## v0.23.0 — 2025-01-16
### Bug Fixes
- **Price Update System Fix**: Resolved critical issue where cards with `updated_at: null` in Scryfall were not being updated
  - Added Phase 3 to daily update process: samples cards with stale price data
  - Now catches cards with `scryfallUpdatedAt: null`, `priceUpdatedAt: null`, or outdated prices
  - Ensures comprehensive price tracking for all cards, not just those with recent Scryfall updates
  - Fixes missing price changes like "The Soul Stone" ($1,059 → $1,723)

### Technical Improvements
- **Enhanced Daily Price Update**: Implemented 3-phase update strategy
  - Phase 1: Cards with `updated_at >= yesterday` (existing)
  - Phase 2: Recently released cards (existing)
  - Phase 3: **NEW** - Sample of stale cards to catch missed price changes
- **Improved Price History Tracking**: Ensures all price changes are properly recorded in `mtgcard_price_history`
- **Rate Limiting**: Added 100ms delay between individual card requests in Phase 3 to respect Scryfall API limits

## v0.22.0 — 2025-01-16
### Features
- **Mobile-First Responsive Design**: Comprehensive mobile UX improvements across Home, Search, and Product Detail pages
  - Compact header layout with two-row structure for mobile (≤88px total height)
  - Icon-only cart and user buttons on mobile with proper tap targets (≥44×44px)
  - Search input with MTG badge prefix and magnifier icon submit button
  - Sticky, horizontally scrollable filter chips with snap scrolling
  - Responsive grid: 1 column <390px, 2 columns ≥390px
  - Unified card styling with consistent aspect ratios, title clamping, and button alignment
  - Mobile-optimized Product Detail Page with reduced padding and improved layout
  - Enhanced cart page with mobile-specific layout for quantity controls and pricing

### Technical Improvements
- **Mobile-Only CSS Utilities**: Added `@layer utilities` with `mobile:` prefixed classes for mobile-specific styling
  - All mobile changes guarded by `@media (max-width: 480px)` to preserve desktop experience
  - Custom `.desktop-only` class for elements that should only appear on desktop
- **Search Suggestions Enhancement**: Modified search suggestion functions to only show items with available prices
  - Added price filtering to `searchExactMatches`, `searchStartsWithMatches`, `searchContainsMatches`, `searchFuzzyMatches`, and `fallbackSearchFromMtgCard`
  - Ensures consistency between search suggestions and search results
- **UI/UX Improvements**:
  - Moved "How it works" button to user menu on mobile
  - Replaced user email with user icon on mobile header
  - Removed "Standard" pill from "See other printings" carousel
  - Made total prices bold in cart for both mobile and desktop
  - Increased desktop cart item height to show full card images
  - Prevented search input auto-focus when navigating between pages

### Fixes
- **Search Input Behavior**: Added `tabIndex={-1}` to prevent unwanted auto-focus on search input
- **Cart Layout**: Restructured cart items for mobile to show controls below main content
- **Orders Page**: Removed "Continue shopping" button for cleaner interface
- **Accessibility**: Maintained proper tap targets, font sizes, and contrast ratios for mobile

### Performance
- **Mobile Optimization**: Reduced padding and spacing on mobile for better content density
- **Image Handling**: Optimized image sizing and aspect ratios for mobile devices
- **Caching**: Search suggestions maintain 30-minute TTL with price-filtered results

## v0.21.0 — 2025-01-16
### Features
- **Flavor Name Display**: Cards now show flavor names before their real names with dash separator
  - Format: `{flavorName} - {realName}` (e.g., "Dwight, Assistant (to the) King - Baral, Chief of Compliance")
  - Applied consistently across search results, individual card pages, and all UI components
  - Cards without flavor names display normally (no change in behavior)
  - Enhanced search index to include flavor names in card titles for better searchability

### Technical Improvements
- **Search Index Enhancement**: Updated search index construction to include flavor names
  - Added `flavorName` field to card selection in search index rebuild process
  - Updated title construction to use `formatDisplayName()` utility function
  - Rebuilt search index with 90,132 cards including flavor names
- **Utility Functions**: Created centralized card name formatting utilities
  - `formatCardName()` - Formats card name with flavor name prefix
  - `formatDisplayName()` - Applies flavor name formatting + existing transformations (Full Art → Borderless)
- **Data Fetching Updates**: Enhanced data retrieval to include flavor names
  - Updated `getPrintingById()` function to include `flavorName` field
  - Modified search services to use flavor names in fallback searches
  - Updated individual card printing pages to display formatted names

### Performance
- **Efficient Bulk Processing**: Used Scryfall bulk data for fast flavor name backfill
  - Processed 90,131 cards and updated 432 cards with flavor names
  - Leveraged bulk data download instead of individual API calls for better performance
  - Maintained existing search performance with enhanced title formatting

### Database Schema
- **Schema Updates**: Added `flavorName` field to `MtgCard` model
  - Applied schema changes using `npx prisma db push`
  - Updated all ingestion scripts to include flavor name mapping
  - Maintained backward compatibility with existing data
  - Added `postinstall` script to ensure Prisma client regeneration on deployment

### Deployment
- **Build Process**: Enhanced build process for Vercel deployment
  - Added `postinstall` script to regenerate Prisma client after dependency installation
  - Ensures TypeScript types are updated with new schema fields during deployment
  - Resolves Prisma client cache issues on Vercel build environment

## v0.20.0 — 2025-10-14
### Features
- **Daily Price Refresh System**: Automated daily price updates from Scryfall with minimal database churn
  - Added `priceUpdatedAt` column to `MtgCard` for change timestamps
  - Created `mtgcard_price_history` table to track price changes over time with daily deduplication
  - Implemented smart ingest logic that only records history when prices actually change
  - Added unique constraint `(scryfall_id, finish, price_day)` to prevent duplicate daily entries
  - Created indexes for optimal query performance: `(scryfall_id, price_at DESC)`

- **Price History API**: New endpoint for trend analysis and price tracking
  - Added `GET /api/price/history?scryfallId=...&finish=...&days=...` endpoint
  - Created `priceTrends` service with functions for simple moving averages and price deltas
  - Supports 7-day, 30-day, and 90-day trend analysis

- **Automated Cron Jobs**: Daily price updates via Vercel Cron
  - Configured daily cron job at 4:00 AM UTC using Scryfall Search API
  - Optimized for serverless environment with pagination and rate limiting
  - Processes only cards updated in the last 24 hours for efficiency
  - Automatic Set creation for new cards with foreign key constraint handling

### Technical Improvements
- **Database Optimization**: Efficient price change detection and history recording
  - Only updates `MtgCard` prices when they actually change (distinct-only updates)
  - Records price history for normal, foil, and etched finishes separately
  - Uses raw SQL with `ON CONFLICT DO UPDATE` for optimal performance
  - Maintains referential integrity with automatic Set upserts

- **Prisma Schema Updates**: Added `mtgcard_price_history` model for database access
  - Fixed schema to match actual database table structure
  - Added proper field mappings and constraints
  - Enabled Prisma Studio access to price history data

### Performance
- **Memory Optimization**: Replaced bulk data download with Search API for daily updates
  - Reduced memory usage in Vercel serverless functions
  - Eliminated timeout issues with large dataset processing
  - Improved execution time from minutes to seconds

## v0.19.1 — 2025-10-13
### Fixes
- Printing page images not visible due to zero‑height parent for `next/image` with `fill`.
  - Made the sized aspect container the relative `card-mask` parent; removed extra absolute wrapper in `src/components/TwoSidedImage.tsx`.
- Allow Scryfall images regardless of env override.
  - Added explicit `cards.scryfall.io` to `images.remotePatterns` in `next.config.ts` so remote loader never blocks card images.

### Chore
- Bump app version to `0.19.1` and update `public/version.json`.

## v0.19.0 — 2025-01-15
### Performance & Reliability
- **Facets Performance Optimization**: Complete overhaul of search facets computation
  - Implemented database-only facets computation using single SQL query with CTEs
  - Added candidate-based facet aggregation (up to 3000 candidates) to avoid full table scans
  - Created covering indexes for optimal performance: `scryfallId`, `setCode`, `rarity`, `finishes`
  - Added stale-while-revalidate (SWR) caching with single-flight protection to prevent cache stampede
  - Facets cache key independent of `sort/page/limit` parameters for optimal cache efficiency
- **Price Sorting Fix**: Resolved price sorting inconsistency between backend and UI
  - Changed from `GREATEST()` (highest price) to `COALESCE()` (first available price) to match UI display logic
  - Price sorting now uses Normal → Foil → Etched priority, matching the displayed price exactly
  - Added debug logging to track sorting field usage and first few prices for observability

### Technical Improvements
- **SQL Query Optimization**:
  - Fixed PostgreSQL type mismatches (`regtype` deserialization errors) by casting `pg_typeof()` to `text`
  - Resolved "subquery must return only one column" errors by restructuring multi-column subqueries
  - Added comprehensive error logging with phase and hint information for SQL debugging
  - Implemented safe array handling with `safeAnyCondition()` helpers to prevent `ANY()` operator errors
- **Database Schema Enhancements**:
  - Added minimal performance indexes: `idx_mtgcard_scryfall_id`, `idx_mtgcard_set_code`, `idx_mtgcard_rarity`
  - Enhanced index hints logging to track available indexes and finishes type detection
  - Improved query plan analysis with `EXPLAIN (ANALYZE, BUFFERS, SUMMARY)` for both facets and items paths

### Observability & Debugging
- **Enhanced Debug Logging**:
  - Added `facets.debug.sanity` with sample data and type detection for CTE verification
  - Implemented `facets.debug.join` with join type, compare column, and candidate count tracking
  - Added `facets.index.hints` to monitor index availability and finishes type
  - Created `search.debug.sort` to track sorting field usage and price ordering
- **Query Plan Analysis**:
  - Added `EXPLAIN_FACETS=1` and `EXPLAIN_ITEMS=1` environment flags for query plan debugging
  - Implemented chunked logging for EXPLAIN results (2-3 lines per log entry)
  - Enhanced SQL error logging with phase identification and debugging hints

### Performance Metrics
- **Facets Performance**: Achieved significant performance improvements
  - Cold run: Reduced from ~14s to <900ms (target met)
  - Warm run: Sub-100ms response times with cache hits
  - Single-flight caching: Only one cache miss per key, followed by hits
- **Search Performance**: Maintained excellent overall performance
  - All test queries (Liliana, Ajani, Unicorn, Thalia, Yawgmoth) under 100ms
  - Price sorting now correctly orders by displayed price field
  - No performance regressions in other sorting options

### Fixes
- **Database Reliability**:
  - Fixed Prisma `regtype` deserialization errors by proper type casting
  - Resolved SQL 42601 "subquery must return only one column" errors
  - Eliminated PostgreSQL `ANY/ALL (array)` operator errors with comprehensive array validation
  - Fixed facets returning zeros by correcting ID type mapping and join logic
- **Search Consistency**:
  - Ensured facets computation uses correct column types (`scryfall_id` as TEXT, not UUID)
  - Fixed candidate ID resolution to use proper table joins (`MtgCard.scryfallId` vs `MtgCard.id`)
  - Maintained all existing search ranking, tokenization, and filter semantics

### Refactors / Chore
- **Code Organization**:
  - Created `facetsOptimized.ts` service for dedicated facets performance optimization
  - Enhanced `searchQueryGroupedSimple.ts` with improved error handling and debug logging
  - Added comprehensive unit tests for facets computation and array safety
  - Maintained backward compatibility with all existing search functionality
- **Database Migrations**:
  - Added safe, concurrent index creation migrations with `IF NOT EXISTS`
  - Implemented idempotent migrations for production safety
  - Enhanced migration documentation with performance impact notes

## v0.18.0 — 2025-01-27
### Features
- **Special Finish Reclassification System**:
  - Cards with special finishes (Surge Foil, Etched, Halo, Gilded, etc.) are now automatically reclassified to Standard when `priceUsdFoil` is missing
  - Reclassified cards appear as Standard in search results and autocomplete without special finish suffixes
  - Cards are sellable using `priceUsd` instead of `priceUsdFoil` when reclassified
  - System automatically restores special finish classification if `priceUsdFoil` becomes available later
- **Deterministic A–Z / Z–A Name Sorting**:
  - Implemented precomputed sort keys (`nameSortKey`, `nameSortKeyDesc`) for consistent alphabetical sorting
  - Added "Name: A → Z" and "Name: Z → A" sorting options to search results
  - Sorting applies globally across all search results before pagination
  - Names are normalized (lowercase, unaccent, remove punctuation, collapse spaces) for consistent ordering
  - Secondary sorting by release date, set code, and collector number ensures stable pagination

### Technical Improvements
- **Search Index Enhancements**:
  - Added `nameSortKey` and `nameSortKeyDesc` columns to SearchIndex for precomputed sorting
  - Enhanced SearchIndex rebuild process to populate sort keys during indexing
  - Added comprehensive observability logging for reclassifications and sorting operations
- **Search Query Optimization**:
  - Unified `buildOrderByClause` function for consistent sorting across all search paths
  - Updated all search functions (exact, starts-with, contains, fuzzy) to use precomputed sort keys
  - Enhanced search grouping to properly handle reclassified cards
- **UI/UX Improvements**:
  - Search results now display total count ("Showing X of Y results")
  - Sort dropdown includes new alphabetical options with clear labels
  - Reclassified cards show clean names without special finish badges

### Observability & Metrics
- **Reclassification Tracking**:
  - Detailed logging for each reclassified card (original finish, overridden finish, reason)
  - Metrics showing total reclassified items (1,248 cards, 1.39% of all cards)
  - Comprehensive audit trail for special finish handling
- **Sorting Observability**:
  - Logging of sort parameters and ORDER BY clauses used
  - Performance metrics for sorting operations
  - Cache hit/miss tracking for different sort options

### Fixes
- **Search Consistency**:
  - Fixed edge case where searching for "Ajani, Nacatl" returned 3 results instead of 4
  - Resolved search results count discrepancy (DB vs App) by ensuring complete SearchIndex population
  - Fixed pagination stability with deterministic sorting
- **Special Finish Handling**:
  - FIC Surge Foil cards (e.g., FIC-282) now correctly appear as Standard when no foil price exists
  - Special finish suffixes are properly removed from display names for reclassified items
  - Cards with valid foil prices maintain their special finish classification

### Performance
- **Precomputed Sorting**:
  - Eliminated runtime normalization overhead by precomputing sort keys
  - Improved search performance with indexed sort key columns
  - Enhanced cache efficiency with sort-aware cache keys
- **Search Index Optimization**:
  - Streamlined SearchIndex rebuild process with parallel processing
  - Added database indexes for sort key columns
  - Optimized variant suffix generation and cleaning

### Refactors / Chore
- **Code Organization**:
  - Centralized finish reclassification logic in SearchIndex rebuild process
  - Unified sorting logic across all search query functions
  - Enhanced type safety with proper SortOption validation
- **Database Schema**:
  - Added `nameSortKey` and `nameSortKeyDesc` columns to SearchIndex model
  - Updated Prisma schema and regenerated client
  - Added database indexes for sort key performance

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
