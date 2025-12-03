# Changelog

## v0.41.0 — 2025-12-03
### Security
- **Next.js Security Update**: Critical security vulnerability fix
  - Upgraded Next.js from 15.5.3 to 16.0.7 (latest stable)
  - Fixes CVE-2025-29927: Middleware authorization bypass vulnerability
  - Updated eslint-config-next to match Next.js version
  - Removed deprecated eslint configuration from next.config.ts
  - Updated TypeScript configuration for Next.js 16 compatibility
  - Build verified and tested successfully

### Technical Changes
- **Next.js Upgrade**: Major version upgrade to Next.js 16.0.7
  - Removed deprecated `eslint` config from next.config.ts (now configured via eslint.config.mjs)
  - Updated tsconfig.json: Changed jsx from "preserve" to "react-jsx"
  - Added `.next/dev/types/**/*.ts` to TypeScript include paths
  - All existing functionality preserved and tested

## v0.40.0 — 2025-01-15
### Features
- **Complete Delivery Workflow**: Full implementation of delivery options for LatamTCG
  - **Dual Delivery Methods**: Users can choose between local pickup and Chilexpress shipping
    - Local pickup in Providencia, Santiago with WhatsApp/email coordination
    - Chilexpress shipping to all regions of Chile with tracking
  - **Delivery Method Selection**: New `DeliveryMethodSelector` component with radio button selection
    - Clear descriptions for each delivery method in both English and Spanish
    - Real-time shipping cost calculation based on selected region
    - Conditional form fields based on selected delivery method
  - **Database Schema Extensions**: Extended Order model with comprehensive delivery fields
    - `deliveryMethod` enum (pickup/courier) with default to courier
    - `deliveryStatus` enum (pending/preparing/shipped/delivered/ready_for_pickup/picked_up)
    - Shipping fields: `shippingCourier`, `shippingCost`, `shippingRegion`, `shippingCity`, `shippingCommune`, `shippingAddressLine1`, `shippingAddressLine2`, `shippingPostalCode`, `shippingInstructions`, `trackingCode`, `shippedAt`, `deliveredAt`
    - Pickup fields: `pickupNotes` for coordination details
  - **Shipping Cost Calculation**: Configurable Chilexpress shipping cost system
    - Region Metropolitana: 3,000 CLP
    - Other regions: 4,000 CLP
    - Centralized configuration in `src/lib/shipping/chilexpress.ts` for easy updates
  - **Enhanced Contact Information**: Improved contact data collection
    - Split name field into `firstName` and `lastName` (required for both delivery methods)
    - International phone number input with country flag selector
    - Defaults to Chile (+56) with validation for 9-digit Chilean numbers
    - E.164 format storage for phone numbers
    - Email field integrated into delivery form for guest users (no popup modal)
  - **Chilean Address System**: Comprehensive address collection for courier delivery
    - Region dropdown with all 16 Chilean regions
    - Commune dropdown dynamically populated based on selected region
    - All communes sorted alphabetically and validated against correct regions
    - City field (optional), Address Line 1 (required), Address Line 2 (optional)
    - Postal code and optional shipping instructions
  - **Email Templates**: Delivery method-specific order confirmation emails
    - Different subject lines and content for pickup vs. courier orders
    - Bilingual support (English and Spanish) for all email content
    - Clear next steps based on delivery method
    - Shipping notification template for when orders are dispatched
  - **Server-Side Validation**: Comprehensive validation at API level
    - Required field validation for all delivery methods
    - Region-specific validation for courier orders
    - Name validation (first and last name required)
    - Phone number format validation
    - Email validation for guest checkout
  - **How It Works Page Updates**: Updated trust hub with delivery information
    - Updated 4-step process to include delivery method selection
    - Expanded delivery guarantee section with Chilexpress details
    - New FAQ entries for local pickup and shipping
    - Clear explanation of pickup coordination via WhatsApp/email near Metro station

### Improvements
- **Cart Page Enhancements**: Improved shopping cart user experience
  - Changed title from "Your cart" to "Shopping Cart" / "Carrito de Compras"
  - Increased title size to `text-3xl` with bold styling
  - Added cards subtotal summary box before item details
  - Clear visual separation between subtotal and individual items
- **Phone Number Input**: Professional international phone number component
  - `PhoneNumberField` component using `react-phone-number-input` library
  - Country flag selector with default to Chile
  - International calling code display
  - Custom validation for Chilean numbers (9 digits after +56)
  - i18n error messages for validation failures
  - SSR-safe dynamic import to prevent hydration issues
- **Form Validation**: Enhanced validation across delivery forms
  - Required field indicators (red asterisks) for all mandatory fields
  - Client-side validation before API calls
  - Server-side validation in checkout API route
  - Clear, localized error messages
- **Guest Checkout Flow**: Streamlined guest checkout experience
  - Email field integrated directly into delivery form (no popup modal)
  - Email required for both pickup and courier delivery methods
  - Seamless form experience for guest users

### Technical Changes
- **New Components**:
  - `DeliveryMethodSelector`: Comprehensive delivery method and address form component
  - `PhoneNumberField`: Reusable international phone number input component
- **New Modules**:
  - `src/lib/shipping/chilexpress.ts`: Shipping cost calculation module
- **Database Migrations**: 
  - Added `DeliveryMethod` and `DeliveryStatus` enums
  - Extended Order model with 15+ new delivery-related fields
  - Added indexes for `deliveryMethod` and `deliveryStatus` for query performance
- **API Updates**:
  - Enhanced `/api/checkout` route with delivery data validation and storage
  - Updated Flow callback to include delivery method in email notifications
- **Translation Keys**: Added 50+ new translation keys for delivery workflow
  - `checkout.delivery.*` namespace for all delivery-related UI text
  - `checkout.delivery.validation.*` for validation messages
  - Updated `howItWorks.*` keys with delivery information
  - Updated `faq.*` keys with delivery-related questions
- **Documentation**: 
  - Created `GOOGLE_OAUTH_SETUP.md`: Comprehensive guide for configuring Google OAuth
  - Created `GOOGLE_OAUTH_QUICK_START.md`: Quick reference for OAuth setup
  - Added verification script: `scripts/verify-google-oauth.sh`

### UX Enhancements
- **Delivery Experience**: Clear, step-by-step delivery selection process
  - Visual distinction between pickup and shipping options
  - Real-time shipping cost display
  - Contextual help text and descriptions
  - Required field indicators for clarity
- **Address Input**: User-friendly address collection
  - Region-based commune dropdown prevents invalid selections
  - Alphabetically sorted commune lists for easy navigation
  - Clear field labels and placeholders
  - Optional vs. required fields clearly marked
- **Form Flow**: Improved form completion experience
  - All delivery information collected in one place
  - No popup modals interrupting the flow
  - Clear validation feedback
  - Responsive design for mobile and desktop

### Bug Fixes
- **Add to Cart Button**: Fixed button click handler
  - Added event.preventDefault() and event.stopPropagation() to prevent parent handlers from intercepting
  - Fixed dependency array in useCallback to include translation function
  - Added pointer-events style to ensure button is clickable
- **Commune Dropdown**: Fixed React rendering issue
  - Added key prop to select element to force re-render when region changes
  - Prevents stale commune options from appearing for wrong regions
- **Phone Number Validation**: Fixed validation logic
  - Proper E.164 format validation
  - Chilean number format validation (9 digits after +56)
  - Clear error messages in both languages

## v0.39.0 — 2025-11-19
### Features
- **Trust Hub Redesign**: Complete reorganization of `/how-it-works` page as the main trust and information hub
  - **New Trust Sections**: Added comprehensive trust-building content including:
    - "How LatamTCG Works" with updated 4-step process
    - "Why Trust LatamTCG" with buyer protection guarantees
    - "Who We Are" section with company background and location
    - "Secure Payments with Flow" with detailed payment security information
    - "Delivery Guarantee" with shipping protection details
    - "Short Return Summary" with quick policy overview
    - Expanded FAQ section with 6 key questions
    - Quick contact section with email and response time
  - **Content Consolidation**: Merged information from `/help` and `/about` pages into `/how-it-works`
    - `/help` and `/about` now redirect to `/how-it-works`
    - All user-facing information accessible from single trust hub
  - **Section Anchors**: Added anchor links (`#faq`, `#contact`, `#returns`, `#about`, `#how-it-works`) for direct navigation
    - Footer links updated to point to specific sections within `/how-it-works`
    - Improved navigation and user experience
- **Language Switching**: Full bilingual support (Spanish/English)
  - **Language Switcher**: Added ES/EN language selector in hamburger menu and footer
    - Cookie-based locale preference storage (1 year expiration)
    - Seamless language switching with page refresh
    - Active language highlighted in UI
  - **English Translations**: Complete English translation file (`messages/en.json`)
    - All content available in both Spanish (default) and English
    - Consistent translation key structure across both languages
  - **Routing Configuration**: Enabled dual-locale support (`es`, `en`)
    - Locale detection via cookies with server-side fallback
    - Maintains URL structure without locale prefixes

### Improvements
- **Returns Policy Update**: Updated refund policy documentation with Flow-specific information
  - **Flow Integration Details**: Added payment processor-specific refund information
    - Debit card refunds: 1-3 business days
    - Credit card refunds: 10 business days
    - 10-day customer acceptance window for refunds
  - **Refund Fees**: Documented Flow's refund fee structure ($202 + IVA = $240 CLP)
    - Clear fee disclosure in returns policy page
    - Highlighted fee information box for visibility
  - **Updated Processing Times**: Aligned refund processing times with Flow's actual service levels
- **Navigation Improvements**: Enhanced footer and menu navigation
  - Footer links now use anchor links to specific sections
  - Improved information architecture with single source of truth
  - Better user flow for finding information

### Technical Changes
- **Component Updates**: 
  - Created `FooterLanguageSwitcher` component for footer language selection
  - Updated `LeftCatalogMenu` with functional ES/EN language switcher
  - Removed language switcher from header (moved to menu and footer)
- **Translation Keys**: Added new translation keys for trust sections
  - `trust.*` namespace for trust-building content
  - `faq.*` namespace for frequently asked questions
  - Updated `returns.*` keys with Flow-specific information
- **API Routes**: Added `/api/locale` route for locale preference management
  - POST endpoint for setting locale cookie
  - Secure cookie handling with proper expiration

### UX Enhancements
- **Information Architecture**: Streamlined user information access
  - Single trust hub page reduces cognitive load
  - Clear section organization with anchor links
  - Progressive disclosure: summary on main page, details on legal pages
- **Bilingual Experience**: Complete Spanish and English support
  - Language preference persists across sessions
  - Consistent terminology and messaging in both languages
  - Easy language switching from multiple locations

## v0.38.0 — 2025-11-17
### Features
- **Complete Internationalization (i18n) Implementation**: Full Spanish language support using `next-intl`
  - **Translation Infrastructure**: Integrated `next-intl` library with Spanish (`es`) as the default locale
    - Centralized translation file: `messages/es.json` with all UI text strings
    - Clear naming convention: `"section.component.key": "Text shown to the user"`
    - Structure prepared for easy addition of English (`en`) in the future
  - **Server & Client Component Support**: Proper translation handling for both component types
    - Server components use `getTranslations()` for metadata and static content
    - Client components use `useTranslations()` hook for interactive elements
    - `NextIntlClientProvider` wraps the entire app for client-side translation access
  - **Routing Configuration**: Single-locale MVP without URL prefixes
    - `localePrefix: 'never'` maintains existing URL structure (no `/es/` prefix)
    - Locale detection happens server-side via `getRequestConfig`
    - All existing routes remain unchanged: `/`, `/mtg/search`, `/mtg/printing/[id]`, etc.
  - **Comprehensive Translation Coverage**: All UI text extracted and translated
    - Header and navigation (user menu, cart badge, search box)
    - Footer with all navigation links and copyright information
    - Home page welcome message and random card button
    - Left catalog menu with all sections and filters
    - Advanced Search page with all form fields and labels
    - Search results grid (filters, sort options, pagination, empty states)
    - Product Detail Pages (PDP) with breadcrumbs, variant labels, and "See other printings" section
    - Cart page with all actions, checkout flow, and guest checkout modal
    - All static pages: Contact, FAQ, Returns, About, How It Works, Terms, Privacy, Orders, Mass Entry
    - Error messages and loading states throughout the app

### Technical Improvements
- **Middleware Configuration**: Enhanced middleware to support i18n without breaking existing routes
  - Excluded static assets and API routes from middleware processing
  - Locale detection handled server-side to avoid routing conflicts
  - Preserved existing authentication and bot blocking functionality
- **Metadata Generation**: Dynamic SEO metadata using translations
  - Page titles and descriptions generated from translation keys
  - Consistent metadata across all translated pages
  - Proper `lang` attribute on HTML element based on locale
- **Translation Keys Organization**: Well-structured translation file
  - Logical grouping by section (header, footer, search, cart, checkout, etc.)
  - Consistent naming patterns for easy maintenance
  - Support for parameterized translations (e.g., `{count}`, `{version}`)
- **Component Refactoring**: Updated all components to use translation system
  - Server components made `async` to support `getTranslations()`
  - Client components updated to use `useTranslations()` hook
  - Maintained all existing functionality and UI design
  - Zero breaking changes to business logic or user experience

### UX Improvements
- **Consistent Spanish Experience**: All user-facing text now in Spanish
  - No mixed languages or untranslated strings
  - Professional, consistent terminology throughout
  - Proper Chilean Spanish formatting for dates, numbers, and currency
- **Guest Checkout Translation**: Complete translation of guest checkout flow
  - Email collection modal fully translated
  - Clear instructions and reassurance messages
  - Error messages and validation feedback in Spanish
- **Filter Translation**: All search filters and options translated
  - Set names, rarity labels, printing types, sort options
  - Filter actions (Clear filters, Show unavailable)
  - Pagination controls and result counts

### Fixes
- **Routing Stability**: Resolved 404 errors caused by locale prefix attempts
  - Fixed middleware to respect `localePrefix: 'never'` configuration
  - Eliminated `/es/` route attempts that were causing 404s
  - Static assets (manifest.json, etc.) now load correctly
- **Translation Key Consistency**: Fixed missing translation keys
  - Added all filter-related translations
  - Completed pagination button aria-labels
  - Ensured all error messages have corresponding translation keys

### Configuration
- **Environment Setup**: No additional environment variables required
  - Uses default Spanish locale configuration
  - Ready for future multi-locale expansion
- **File Structure**: Clean organization of translation files
  - `messages/es.json` for Spanish translations
  - `src/i18n/routing.ts` for routing configuration
  - `src/i18n/request.ts` for server-side message loading
  - `next.config.ts` updated with `next-intl` plugin

### Documentation
- **Translation System**: Complete implementation ready for production
  - All components documented with translation usage patterns
  - Clear instructions for adding English support in the future
  - Maintained backward compatibility with existing codebase

## v0.37.0 — 2025-01-XX
### Features
- **SEO Metadata & Social Sharing**: Comprehensive SEO optimization for product detail pages
  - **Meta Tags**: Unique meta title, description, and canonical URL for each product
    - Meta title format: "{Product Name} | LatamTCG"
    - Meta description includes product type, set information, and current price
    - Canonical URLs for proper search engine indexing
  - **Open Graph Tags**: Complete OG metadata for social media sharing
    - Product title, description, and image for rich previews
    - Proper image dimensions (488x680) matching card aspect ratio
    - Site name and type metadata for consistent branding
  - **Twitter Card**: Large image card support for Twitter sharing
    - Summary large image card type for optimal Twitter display
    - Product-specific images and descriptions
  - **Social Share Buttons**: Direct sharing to Twitter and WhatsApp
    - Twitter share button with pre-filled product information
    - WhatsApp share button for easy mobile sharing
    - Responsive design with icon-only labels on mobile
    - Opens share dialogs in new windows with proper security attributes

### Technical Improvements
- **Metadata Generation**: Enhanced `generateMetadata` function with comprehensive SEO data
  - Server-side price calculation for accurate descriptions
  - Dynamic product name formatting with variant suffixes
  - Proper base URL handling for canonical and OG URLs
  - Graceful fallbacks for error cases
- **Share Component**: New `ShareButtons` client component
  - Memoized URL generation for optimal performance
  - Accessible button design with proper ARIA labels
  - Consistent styling with existing design system
- **Performance**: Zero impact on rendering performance
  - Share buttons are client components (no SSR overhead)
  - Metadata generation runs separately from page rendering
  - No additional data fetching required

### SEO Enhancements
- **Search Engine Optimization**: Changed robots meta from `noindex` to `index` for product pages
  - Product pages now indexed by search engines
  - Proper canonical URLs prevent duplicate content issues
  - Rich snippets support through structured metadata

## v0.36.0 — 2025-11-12
### Features
- **Comprehensive Loading System**: Complete overhaul of loading states and user feedback
  - **Global Loading Provider**: Context-based loading state management with ref-counting
    - `LoadingProvider` component with `useLoading()` hook for global loading state
    - `withLoading()` helper to automatically manage loading state for async operations
    - Ref-counted loading state supports multiple concurrent operations
  - **Global Progress Indicator**: Slim top progress bar for route transitions and long operations
    - Integrates with `LoadingProvider` to show progress during any loading state
    - Automatically handles route changes via pathname detection
    - Replaces old `ProgressBar` component with enhanced functionality
  - **Delayed Flag Hook**: `useDelayedFlag()` prevents flicker while guaranteeing timely feedback
    - Shows skeletons only if loading takes longer than 150ms
    - Ensures visual feedback appears within 150ms threshold
    - Prevents jarring skeleton flashes on fast loads

- **Skeleton Component Library**: Comprehensive skeleton primitives and page-level skeletons
  - **Primitives** (9 components): TextLine, Avatar, Card, ListItem, GridCard, Image, Badge, Price, Button
    - All skeletons match final content dimensions to prevent layout shift (CLS)
    - Configurable via props (size, lines, rounded, etc.)
    - Proper ARIA attributes for accessibility
  - **Page-Level Skeletons** (4 components):
    - `SearchPageSkeleton`: Search/PLP with filter bar + responsive grid (8-12 items)
    - `ProductDetailSkeleton`: PDP with image gallery, title, badges, price, CTA button
    - `CartPageSkeleton`: Cart with items list, totals summary, checkout button
    - `TablePageSkeleton`: Generic table/list pages with header + rows

- **Enhanced User Experience**: Consistent loading feedback across all pages
  - Search results show `GridCardSkeleton` during loading with 150ms delay
  - Cart page uses `CartPageSkeleton` for initial load
  - Product detail pages use `ProductDetailSkeleton` for route-level loading
  - All skeletons fade out smoothly with 150ms transitions

### Technical Improvements
- **Accessibility Enhancements**:
  - All skeletons use `aria-hidden="true"` (decorative)
  - Loading containers use `aria-busy="true"` and `aria-live="polite"`
  - Reduced motion support: animations disabled for `prefers-reduced-motion`
  - Smooth fade-out transitions (150ms) for skeleton removal
- **Route Transition Integration**:
  - `GlobalProgress` automatically detects route changes via `usePathname()`
  - Loading state properly managed during navigation
  - No additional setup required in individual pages
- **Component Architecture**:
  - Centralized skeleton components in `src/components/ui/skeletons/`
  - Barrel exports for easy importing
  - Consistent styling using existing CSS variables and Tailwind classes

### Performance
- **Layout Stability**: All skeletons match final content dimensions (no CLS)
- **Fast Feedback**: Visual feedback guaranteed within 150ms
- **Smooth Transitions**: 150ms fade-out prevents jarring content swaps
- **Optimized Rendering**: Skeletons only render when needed (delayed flag)

### Documentation
- **Comprehensive Guide**: Created `docs/loading.md` with:
  - Architecture overview and component API documentation
  - Usage examples for common patterns
  - Best practices and migration guide
  - Testing checklist and accessibility guidelines
  - File structure reference

### Refactors / Chore
- **Updated Existing Components**:
  - `SearchResultsGrid`: Now uses `GridCardSkeleton` with delayed flag
  - `CartPage`: Updated to use `CartPageSkeleton`
  - Product detail `loading.tsx`: Uses `ProductDetailSkeleton`
- **Root Layout Integration**: `LoadingProvider` and `GlobalProgress` mounted globally
- **CSS Enhancements**: Added skeleton fade-out transitions and reduced motion support

## v0.35.0 — 2025-11-11
### Features
- **Left Navigation Menu Overhaul**: Complete redesign of the left catalog menu with modern, mobile-first UX
  - **Accordion Behavior**: Changed to single-selection mode (only one section open at a time) for cleaner interface
  - **Shop Section**: Singles link now points to `/mtg/search` (main search page)
  - **Mass Entry Page**: Created temporary page at `/mass-entry` with "Coming Soon" message for future bulk card entry functionality
  - **Sets Section**: Latest 8 sets displayed with set symbols, parent set fallback, and generic MTG symbol fallback
  - **Quick Filters**: Fixed all filter links to use proper search parameters:
    - Foil / Etched: `/mtg/search?printing=foil&printing=etched`
    - Full Art / Showcase: `/mtg/search?q=full+art+OR+showcase+OR+borderless`
    - Rare / Mythic: `/mtg/search?rarity=rare&rarity=mythic`
    - Recently Released: `/mtg/search?sort=release_desc`
  - **Advanced Search Page**: Comprehensive search interface at `/search/advanced` with:
    - Search query input
    - Multi-select set picker with searchable list and set symbols
    - Rarity filters (Common, Uncommon, Rare, Mythic)
    - Printing filters (Normal, Foil, Etched)
    - Sort options (Relevance, Name, Price, Release Date, Most Popular)
    - Show unavailable cards toggle
- **All Sets Page Enhancement**: Updated `/mtg/sets` page to use set symbols instead of card images
  - Uses Scryfall set symbol SVGs with intelligent fallback system
  - Parent set symbol fallback for promo sets (e.g., "Marvel's Spider-Man Promos" uses "Marvel's Spider-Man" symbol)
  - Generic MTG symbol fallback for sets without symbols
  - Consistent with left menu set symbol display logic
- **Foil Card Shine Effect**: Added visual enhancement for foil cards on product detail pages
  - Static glow effect with radial gradient overlay when foil is selected
  - Continuous animated shine sweep across the card (3-second cycle)
  - Enhanced image filters (brightness, contrast, saturation) for premium appearance
  - Smooth transitions when switching between Normal and Foil variants
  - Event-based communication between variant selector and image component

### Data Filtering & Quality
- **Global Release Window Filter**: Implemented 14-day release window for all MTG sets
  - Only sets with `released_at <= (today + 14 days)` are shown throughout the app
  - Sets with `released_at = NULL` are excluded
  - Applied to all queries reading from `Set` or `MtgCard` tables
  - Centralized constant `RELEASE_CUTOFF` in `lib/db/constants.ts` for consistency
- **Empty Set Exclusion**: Sets with 0 cards are now excluded from all queries
  - Applied to set listings, search results, and all catalog pages
  - Prevents display of sets like PH23 that have no available cards
- **Heroes of the Realm Exclusion**: All "Heroes of the Realm" sets are excluded from the app
  - 8 sets excluded: ph17, ph18, ph19, ph20, ph21, ph22, ph23, phtr
  - Applied globally across all queries and search results
  - Future "Heroes of the Realm" sets will be automatically excluded

### UI/UX Improvements
- **Set Symbol Display**: Enhanced set symbol system with intelligent fallbacks
  - Primary: Set's own symbol from Scryfall
  - Fallback 1: Parent set symbol (for promo sets)
  - Fallback 2: Generic MTG symbol
  - Applied consistently in left menu and All Sets page
- **Left Menu Polish**: Improved visual consistency and alignment
  - Advanced Search section properly aligned with other accordion headers
  - Removed year display from sets list for cleaner interface
  - Cache-busting for fresh set data on menu open

### Technical Improvements
- **Search Query Updates**: Enhanced all search services with release window and set exclusions
  - Updated `searchOptimized.ts`, `searchQueryGroupedSimple.ts`, `facetsOptimized.ts`
  - All search queries now filter by release date and exclude empty/Heroes sets
- **API Route Updates**: Updated all relevant API routes with new filters
  - `/api/search/sets`: Excludes empty sets and Heroes sets
  - `/api/search/suggest`: Filters by release window and excludes Heroes sets
  - `/api/popular-cards`: Only shows cards from sets within release window
- **Component Architecture**: Created reusable components for set symbols
  - `SetSymbol` component with fallback logic
  - `CardImageWithShine` component for foil effect
  - Proper event-based communication between components

### Performance
- **Query Optimization**: All set queries now use efficient filtering
  - Prisma queries use relation filters (`cards: { some: { isPaper: true } }`)
  - SQL queries use `INNER JOIN` with proper `WHERE` clauses
  - Reduced unnecessary data processing

## v0.34.0 — 2025-11-11
### Features
- **Cart Variant Support**: Enhanced cart to treat normal, foil, and etched versions as separate items
  - Users can now add multiple variants of the same card (e.g., 2x Normal + 3x Foil = 5 items)
  - Cart items display variant labels (Normal, Foil, Etched) for clarity
  - Variant selection properly passed from product page to cart
  - Database schema updated with `finish` field on `CartItem` model
- **Cart Persistence**: Cart items now persist until payment is 100% confirmed
  - Cart items remain available if payment fails or is cancelled
  - Cart is only marked as checked out when payment status is confirmed as 'paid'
  - Prevents loss of cart items when external payment process fails
- **Payment Cancellation Handling**: Improved user experience for cancelled payments
  - Cancelled payments automatically redirect to cart instead of showing stuck processing page
  - Order status updated immediately when Flow returns cancellation status
  - Cart items preserved for retry after cancellation
- **Cart Navigation**: Enhanced cart page with clickable items
  - Card images and item names are now clickable links to product pages
  - Improved user experience for reviewing cart items

### Performance
- **Cart Update Optimization**: Significantly improved cart update performance
  - Replaced full cart item fetch with database aggregation queries
  - Uses SQL `SUM()` for total count calculation
  - Uses raw SQL `SUM(quantity * unitPrice)` for total price calculation
  - Parallel query execution for faster response times
  - Reduced response times from 3-19 seconds to sub-second for most operations

### Fixes
- **Variant Selection**: Fixed issue where selecting Foil variant added Normal version to cart
  - Added `variant` prop to `AddToCartButton` component dependency array
  - Fixed debounce key to include variant for proper request tracking
  - Variant selection now correctly passed through entire checkout flow
- **Cart Item Display**: Fixed cart to show correct variant prices and labels
  - Cart items now display the correct finish label (Normal, Foil, Etched)
  - Price matching logic improved to correctly identify variant by stored unitPrice
  - Full card names with variant suffixes displayed consistently

### Technical Improvements
- **Database Migrations**: Applied cart variant support migrations
  - Added `finish` column to `CartItem` table with default 'normal'
  - Added unique constraint on `(cartId, printingId, finish)` combination
  - Fixed previous migration issues with OrderStatus enum
- **Error Handling**: Enhanced error handling for payment cancellations
  - Return URL handler detects Flow cancellation status codes (3, 4)
  - Order status updated immediately on cancellation detection
  - Graceful fallback to cart redirect for all error scenarios
- **Status Polling**: Improved order status polling with timeout protection
  - Maximum polling limit (10 polls = 30 seconds) prevents infinite loops
  - Automatic redirect to cart on timeout or error
  - Better user experience for stuck payment processing pages

## v0.33.0 — 2025-11-05
### Features
- **Flow Payment Gateway Integration**: Complete end-to-end payment processing
  - Integrated Flow.cl payment gateway for Chilean market (CLP payments)
  - Guest checkout support with email collection
  - Authenticated user checkout support
  - Real-time payment status updates via webhooks
  - Order confirmation emails via Resend

### Database
- **Order Model Enhancements**: Added Flow payment fields
  - `amountCLP`: Payment amount in Chilean Pesos
  - `status`: Order status enum (pending, paid, failed, cancelled)
  - `flowToken`: Unique Flow payment token
  - `flowOrder`: Flow order identifier
  - `flowPaymentId`: Flow payment ID after completion
  - `paidAt`: Payment completion timestamp
  - `metadata`: JSON field for order details (items, prices, etc.)
- **PaymentLog Model**: Audit trail for payment events
  - Tracks all payment events (created, callback_received, paid, failed, etc.)
  - Stores full event payloads for debugging and compliance
  - Indexed by orderId, createdAt, and event type

### API Routes
- **POST /api/checkout**: Creates orders and initiates Flow payments
  - Server-side price calculation (CLP from USD)
  - Minimum order validation (configurable, default 1,000 CLP)
  - Flow payment creation with HMAC-SHA256 signature
  - Returns payment URL for client redirect
- **POST /api/flow/callback**: Webhook handler for payment status
  - Signature verification using Flow secret key
  - Payment status confirmation via Flow API
  - Order status updates (paid/failed/cancelled)
  - Amount validation to prevent discrepancies
  - Idempotency checks to prevent duplicate processing
  - Automatic order confirmation email sending
- **POST /api/checkout/return**: Handles Flow redirects (POST to GET conversion)
  - Parses Flow form data
  - Extracts payment token
  - Redirects to return page with query parameters
- **GET /api/orders/[orderId]/status**: Order status polling endpoint
  - Used by return page for real-time status updates
  - Supports both authenticated and guest orders

### UI Components
- **Checkout Return Page** (`/checkout/return`): Payment completion page
  - Displays order status (success/failure/pending)
  - Shows order summary with items and totals
  - Real-time polling for pending payments
  - Client-side status updates via SWR
- **Cart Page Updates**: Integrated Flow checkout flow
  - Guest checkout with email prompt
  - Authenticated checkout
  - Redirects to Flow payment page
  - Error handling for payment failures

### Admin Features
- **Admin Orders Page** (`/admin/orders`): View all orders
  - Token-protected admin interface
  - Order listing with status filtering
  - Detailed order information (customer, items, payment details)
  - Payment event logs
  - Flow payment tracking information

### Email Integration
- **Resend Integration**: Order confirmation emails
  - HTML and plain text email templates
  - Chilean number formatting (periods for thousands)
  - Order details with items, prices, and totals
  - Configurable via environment variables

### Security & Quality
- **HMAC-SHA256 Signature**: Flow API request signing
  - Correct signature format per Flow.cl documentation
  - Parameter sorting and concatenation
  - Secret key from gateway.flow.cl (not regular Flow account)
- **Amount Validation**: Prevents payment discrepancies
  - Compares Flow payment amount with order amountCLP
  - Logs discrepancies for audit
- **Idempotency**: Prevents duplicate payment processing
  - Checks order status before updating
  - Ignores already-processed payments
- **Error Handling**: Comprehensive logging and error messages
  - Payment creation errors
  - Webhook processing errors
  - Email sending failures (non-blocking)

### Configuration
- **Environment Variables**: Added Flow and Resend configuration
  - `FLOW_API_KEY`: Flow API key from gateway.flow.cl
  - `FLOW_SECRET`: Flow secret key from gateway.flow.cl
  - `FLOW_BASE_URL`: Flow API base URL (https://www.flow.cl/api)
  - `FLOW_RETURN_URL`: Return URL after payment
  - `FLOW_CALLBACK_URL`: Webhook callback URL
  - `APP_BASE_URL`: Application base URL
  - `RESEND_API_KEY`: Resend API key for emails
  - `RESEND_FROM_EMAIL`: Sender email address

### Documentation
- **README Updates**: Comprehensive Flow integration guide
  - Setup instructions
  - Environment variable configuration
  - Local testing with ngrok
  - Domain verification for production emails
  - Security best practices

### Testing & Development
- **Mock Payment Endpoint**: `/api/dev/payments/mock`
  - Development-only endpoint for testing callbacks
  - Simulates payment status updates
  - Only active when `NODE_ENV !== 'production'`

## v0.32.1 — 2025-11-04
### Fixes
- **Most Popular Sort**: Fixed SQL query error when sorting by popularity
  - Added `popularity_score` column to all CTEs in optimized search query
  - Ensured column is selected in `search_results`, `paginated_results`, and final SELECT
  - Resolves "column popularity_score does not exist" error in production
  - Query now correctly includes popularity score in result set for ORDER BY clause

### Configuration
- **Cron Job Schedule**: Updated to daily schedule for Vercel Hobby tier compatibility
  - Changed from every 15 minutes (`*/15 * * * *`) to daily at 4:00 AM UTC (`0 4 * * *`)
  - Removed searchindex-refresh cron job to comply with Hobby tier limit (1 cron job per day)
  - Popularity materialized view now refreshes once daily instead of every 15 minutes

## v0.32.0 — 2025-11-04
### Features
- **Most Popular Sort**: New default sort option that orders search results by popularity score
  - Popularity score calculated from sales (30d) and cart adds (30d): `1.0 * sales_30d + 0.6 * cart_adds_30d`
  - Tie-breakers: release date (DESC) then title (ASC)
  - Items with no events (score = 0) appear after scored items
  - Materialized view `item_popularity_mv` pre-computes scores for fast query performance
  - Auto-refreshes every 15 minutes via cron job (`/api/jobs/refresh-popularity`)
  - Feature flag: `MOST_POPULAR_ENABLED=true` to enable (defaults to relevance when disabled)
  - Window parameter: `MOST_POPULAR_WINDOW_DAYS=30` (currently hardcoded to 30 days)

### Technical Improvements
- **Database Migration**: Added materialized view for popularity aggregation
  - `item_popularity_mv` aggregates `OrderItem` and `CartItem` data over rolling 30-day window
  - Unique index on `printing_id` for CONCURRENT REFRESH support
  - Index on `popularity_score DESC` for optimal sort performance
  - Initial population and refresh scripts included
- **Search Integration**: Updated both optimized and original search implementations
  - LEFT JOIN to `item_popularity_mv` when sort is `most-popular`
  - Order by: `popularity_score DESC NULLS LAST, releasedAt DESC NULLS LAST, title ASC`
  - Fallback to `MtgCard.releasedAt` when `SearchIndex.releasedAt` is null
  - No performance regression - join only happens when sort is `most-popular`
- **UI Updates**: Added "Most Popular" option to sort dropdown
  - New sort option appears first in dropdown
  - Defaults to most-popular when `MOST_POPULAR_ENABLED=true`
  - Maintains user's manual sort choice until next search
- **Cron Job**: Automated refresh mechanism
  - Runs every 15 minutes via Vercel cron (`*/15 * * * *`)
  - Uses CONCURRENT REFRESH to avoid blocking reads
  - Includes telemetry logging (row count, max score, avg score)

### Backward Compatibility
- Fully backward compatible - existing sorts unchanged
- Falls back to "relevance" when `MOST_POPULAR_ENABLED` is false
- No changes to search filters or FTS matching logic
- All existing functionality preserved

## v0.31.0 — 2025-10-28
### Current Price Rollout (RLS, PDP flag, API fallback)
- Database:
  - Added RLS read-only policy on `public.mtgcard_current_price` for `anon, authenticated` (no client writes).
  - Updated `public.v_card_with_price` to cast `MtgCard."scryfallId"::uuid` in the JOIN for compatibility.
- Backend:
  - New `getCurrentPrice(scryfallId, finish)` util using Supabase anon key for reads.
  - Price history API falls back to a single current-price data point when no history rows exist.
- Frontend (PDP):
  - Feature flag `NEXT_PUBLIC_PRICE_HISTORY_ENABLED` gates the Price History chart.
  - When disabled, shows a null-safe "Last price update" line with USD and timestamp.
- Scripts & Docs:
  - Standalone SQL scripts to disable pruning and drop history when ready: `scripts/db/disable_history.sql`, `scripts/db/drop_history.sql`.
  - Maintenance README documents UPSERT SQL for local daily job and verification queries.

## v0.30.0 — 2025-01-24
### Price Ingestion Pipeline Optimization
- **Split Phase 1 Pipeline**: Divided the monolithic price ingestion into two Vercel-safe steps for Hobby tier compatibility
  - **Phase 1A (Stage)**: Downloads CSV → loads into staging table with 10k batch inserts (~13s)
  - **Phase 1B (Update)**: Set-based UPDATE with `IS DISTINCT FROM` guard to avoid no-op updates (~10s)
  - **Phase 2 (History)**: Upserts price history records with UNION ALL (~16s)
  - **Phase 3 (Retention)**: 30-day data retention cleanup (~2s)
  - Each phase completes well under 60-second Vercel Hobby tier limit

- **Vercel Cron Configuration**: Updated cron schedule for optimal performance
  - **06:30 America/Santiago**: Stage (Phase 1A) - `/api/cron/ingest-stage`
  - **06:33 America/Santiago**: Update (Phase 1B) - `/api/cron/ingest-update`
  - **06:36 America/Santiago**: History Upsert (Phase 2) - `/api/cron/ingest-history`
  - **03:00 America/Santiago**: 30-day Retention (Phase 3) - `/api/cron/retention-30d`

- **Smart Optimization Features**:
  - **IS DISTINCT FROM Guard**: Only updates cards that actually changed (73 vs 90k+ cards)
  - **Batch Processing**: 10k batches for Vercel serverless safety
  - **Audit Logging**: Complete run tracking with run IDs in `ingestion_runs` table
  - **Error Handling**: Proper error logging and recovery for each phase

- **SSL Security Enhancement**: Production-ready SSL configuration
  - **Production Mode**: Requires `SUPABASE_CA_PEM_BASE64` with `sslmode=verify-full`
  - **Development Mode**: Falls back to `sslmode=disable` with security warnings
  - **Session Pooler**: Uses Supabase Session Pooler URL for optimal connections

- **Local Fallback Preservation**: Original `scripts/ingest-scryfall-prices-secure.ts` remains completely untouched
  - `npm run ingest:prices` still works perfectly for local development
  - Can be used for testing and development without affecting production pipeline

### Technical Improvements
- **New Scripts Created**:
  - `scripts/vercel-ingest-stage.ts` - Phase 1A: CSV download and staging
  - `scripts/vercel-ingest-update.ts` - Phase 1B: Set-based card updates
  - `scripts/vercel-ingest-upsert-history.ts` - Phase 2: Price history upserts
  - `scripts/vercel-retention-30d.ts` - Phase 3: Data retention cleanup

- **API Routes**: Token-protected endpoints for each phase
  - `/api/cron/ingest-stage` - Phase 1A with authentication
  - `/api/cron/ingest-update` - Phase 1B with authentication
  - `/api/cron/ingest-history` - Phase 2 with authentication
  - `/api/cron/retention-30d` - Phase 3 with authentication

- **NPM Scripts**: Added convenience scripts for local testing
  - `vercel:ingest:stage` - Test Phase 1A locally
  - `vercel:ingest:update` - Test Phase 1B locally
  - `vercel:history-upsert` - Test Phase 2 locally
  - `vercel:retention` - Test Phase 3 locally

### Performance Metrics
- **Phase 1A (Stage)**: < 15-20s target (actual: ~13s ✅)
- **Phase 1B (Update)**: < 35-40s target (actual: ~10s ✅)
- **Phase 2 (History)**: < 20s target (actual: ~16s ✅)
- **Phase 3 (Retention)**: < 15s target (actual: ~2s ✅)
- **Total Pipeline**: ~41s (well under 60s Vercel Hobby limit)

### Git Configuration
- **Enhanced .gitignore**: Added comprehensive patterns for large files and data
  - Large data files: `data/*.json`, `data/*.csv`, `data/*.gz`, `data/*.zip`
  - Large files: `*.large`, `*.big`, `*.huge`
  - Temporary files: `*.tmp`, `*.temp`, `/tmp/`, `/temp/`
  - Log files: `*.log`

### Deployment & Configuration
- **Production Ready**: All phases tested locally and ready for Vercel deployment
- **Environment Variables**: Proper SSL configuration with CA certificate support
- **Monitoring**: Complete audit logging with run IDs and performance metrics
- **Rollback Safety**: Local fallback preserved for emergency use

## v0.29.0 — 2025-01-23
### Product Detail Page (PDP) UX Enhancements
- **Prominent Price Display**: Added PriceBlock component for prominent CLP price display under card title
  - **Visual Hierarchy**: Large 3xl font size makes price the visual focal point
  - **Chilean Formatting**: Uses `es-CL` locale for proper CLP number formatting
  - **Variant Badge**: Shows current variant (Normal, Foil, Etched) with badge styling
  - **Graceful Fallbacks**: Shows "—" when price is not available

- **Interactive Variant Selector**: Implemented radio-card UI for variant selection
  - **Clear Visual Cards**: Radio buttons with inline price display for each variant
  - **Immediate Feedback**: Price updates instantly when switching variants
  - **Mobile-Friendly**: Large tap targets (44px+) for easy mobile interaction
  - **Accessibility**: Proper ARIA labels and keyboard navigation support

- **Smart Add to Cart Integration**: Enhanced cart functionality with policy awareness
  - **Unified Experience**: Add to Cart button integrated directly under variant selector
  - **Clean Layout**: Removed legacy pricing display to eliminate redundancy
  - **Consistent Spacing**: Balanced vertical rhythm throughout the page

- **Persistent Variant Memory**: User preferences saved across sessions
  - **localStorage Integration**: Remembers variant choice per card (`variant-${printingId}`)
  - **Smart Fallback**: Uses saved preference if available, otherwise defaults to server-recommended variant
  - **Cross-Session Persistence**: Choice persists when user leaves and returns to the page

- **Micro-Animations**: Smooth transitions for enhanced user experience
  - **Price Updates**: 200ms fade animation when switching variants
  - **Visual Feedback**: Price and badge fade to 50% opacity during transition
  - **Polished Feel**: Eliminates jarring instant price changes

- **Mobile Breadcrumb Optimization**: Improved navigation for mobile devices
  - **Compact Design**: Smaller text and spacing for mobile screens
  - **Same Functionality**: Maintains exact same navigation structure as desktop
  - **Smart Truncation**: Long names truncate gracefully with tooltips
  - **Space Efficient**: Takes minimal vertical space while preserving all navigation links

### Technical Improvements
- **Server-Side Variant Resolution**: Smart selection of best available variant and price
  - **Pricing Integration**: Uses existing `getDisplayPriceServer()` for accurate CLP pricing
  - **Availability Checking**: Only includes variants that are actually available
  - **Fallback Logic**: Graceful handling when no prices are available

- **Component Architecture**: Clean separation of concerns
  - **PriceBlock**: Reusable component for prominent price display
  - **VariantSelector**: Interactive variant selection with radio cards
  - **VariantSectionClient**: Client wrapper managing state and interactions
  - **Helper Functions**: Server-side variant computation and resolution

### User Experience Enhancements
- **Reduced Cognitive Load**: Cleaner interface focuses on essential elements
- **Faster Decision Making**: Prominent pricing and clear variant selection
- **Consistent Behavior**: Same functionality across desktop and mobile
- **Improved Accessibility**: Proper ARIA labels and keyboard navigation
- **Mobile Optimization**: Touch-friendly interface with appropriate sizing

## v0.28.0 — 2025-01-17
### Authentication Fixes
- **Production Authentication**: Fixed authentication configuration issues in production environment
  - **Environment Variables**: Resolved missing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuration
  - **OAuth Redirect URLs**: Fixed Google OAuth redirect URL mismatch between development and production
  - **Supabase Configuration**: Updated Site URL and Redirect URLs in Supabase dashboard for proper production OAuth flow
  - **Error Handling**: Improved authentication error messages and debugging capabilities

### Search UX Improvements
- **Search Suggestions**: Fixed search suggestions remaining visible after navigation
  - **State Management**: Properly reset suggestions state when navigating to item details pages
  - **Navigation Cleanup**: Clear suggestions panel when clicking on search results
  - **Page Navigation**: Suggestions now only appear when actively typing in search bar
  - **User Experience**: Improved search flow by ensuring suggestions don't persist across page changes
  - **Enhanced Detection**: Added multiple navigation detection methods including MutationObserver and click-outside handlers
  - **Robust Cleanup**: Comprehensive state reset including timeouts, abort controllers, and focus management

- **User Menu**: Fixed user menu (Orders and Sign Out) remaining open after navigation
  - **Navigation Detection**: Close user menu when navigating between pages using pathname changes
  - **Click Outside Handler**: Close menu when clicking anywhere outside the user menu
  - **Keyboard Support**: Close menu when pressing Escape key
  - **Consistent Behavior**: User menu now behaves consistently across all navigation scenarios

### Technical Improvements
- **Environment Configuration**: Enhanced environment variable validation and error reporting
- **OAuth Flow**: Fixed Google OAuth authentication flow for production deployment
- **Debug Tools**: Improved authentication debugging with better error messages and environment variable visibility
- **Search Component**: Enhanced SearchBox component state management for better UX

### Deployment & Configuration
- **Production Ready**: Authentication now works correctly in production environment
- **Environment Variables**: Proper configuration of Supabase environment variables in Vercel deployment
- **OAuth Setup**: Corrected Google OAuth configuration for production domain

## v0.27.0 — 2025-01-17
### Bot Control & Image Optimization
- **Bot Blocking System**: Implemented comprehensive bot traffic control to reduce unwanted crawler consumption of Vercel Image Transformations
  - **robots.txt**: Created `/public/robots.txt` that blocks GPTBot and AhrefsBot while allowing other agents
  - **Edge Middleware**: Hard blocks abusive bots with HTTP 403 responses in production (unless `ALLOW_BOTS=true`)
  - **Feature Flag**: `ALLOW_BOTS` environment variable for easy rollback and testing
  - **Static Asset Bypass**: Middleware excludes internal assets (`/_next/*`, `/favicon.ico`, `/robots.txt`, etc.) to avoid overhead

- **Image Optimization Controls**: Added feature flags to control Next.js image optimization globally
  - **Global Flag**: `NEXT_IMAGE_UNOPTIMIZED=true` disables Next.js image optimization to bypass Vercel transformations
  - **Reduced Breakpoints**: Tightened `deviceSizes` to `[640, 768, 1024]` and `imageSizes` to `[16, 32, 64, 128]` to limit generated variants
  - **SmartImage Component**: Optional wrapper component for component-level image optimization control
  - **Backward Compatibility**: All existing `next/image` imports continue to work without changes

- **SEO Control**: Added noindex metadata to crawl-heavy pages to reduce bot traffic
  - **Search Page**: `/mtg/search` now sends `x-robots-tag: noindex, nofollow`
  - **Printing Pages**: `/mtg/printing/[printingId]` pages now send `x-robots-tag: noindex, nofollow`
  - **Metadata Integration**: Uses Next.js App Router metadata API for proper SEO control

### Technical Improvements
- **Environment Variables**: Added comprehensive bot control and image optimization configuration
  - `ALLOW_BOTS`: Set to `true` to bypass bot blocking in production (default: `false`)
  - `NEXT_IMAGE_UNOPTIMIZED`: Set to `true` to disable Next.js image optimization globally (default: `false`)
  - `NEXT_PUBLIC_IMAGE_UNOPTIMIZED`: Set to `true` for component-level image optimization control (default: `false`)
- **Documentation**: Updated README.md with detailed environment variable documentation and usage examples
- **Middleware Enhancement**: Extended existing middleware to include bot blocking while preserving user context functionality

### Performance & Cost Optimization
- **Vercel Image Transformations**: Significantly reduced transformation usage through bot blocking and image optimization controls
- **Crawler Traffic Reduction**: Blocks high-volume crawlers (GPTBot, AhrefsBot) that consume resources without providing value
- **Image Variant Reduction**: Fewer responsive image sizes reduce storage and processing costs
- **Feature Flag Architecture**: Idempotent implementation allows quick rollback if needed

### Deployment & Configuration
- **Production Ready**: All changes are production-safe with proper environment variable controls
- **Vercel Integration**: Optimized for Vercel deployment with proper middleware configuration
- **Monitoring Ready**: Bot blocking responses can be monitored via Vercel Runtime Logs
- **Validation**: Comprehensive acceptance criteria for post-deployment verification

## v0.26.0 — 2025-01-17
### Price History Chart Enhancements
- **Dual Price Lines**: Added support for displaying both normal and foil price trends simultaneously
  - Blue line for normal prices, amber line for foil prices
  - Automatic scaling to accommodate both price ranges
  - Conditional display based on available price data
- **Enhanced Trend Analysis**: Added separate 30-day trend calculations for normal and foil prices
  - Independent trend percentages and direction indicators
  - Color-coded trends (green for up, red for down, purple for stable)
  - Clean format without cluttering text labels
- **Improved Tooltips**: Enhanced hover tooltips to show both price types when available
  - Displays normal and foil prices separately in tooltips
  - Proper CLP conversion using app's pricing policy
  - Clean formatting without decimals
- **Chart Optimizations**: Multiple UI/UX improvements
  - Removed legend for cleaner interface
  - Reduced chart height for better space utilization
  - Removed price range display to focus on trends
  - Fixed React key prop warnings for better console cleanliness

### UI/UX Improvements
- **Item Details Pages**: Removed variant pills (e.g., "Borderless") for cleaner interface
  - Variant information still included in card name suffix
  - Simplified layout without cluttering badges
  - Maintained all functionality while improving visual clarity

### Technical Fixes
- **React Compliance**: Fixed React key prop spreading warnings in chart components
  - Proper key prop handling in CustomDot components
  - Clean console output without React warnings
- **Price Conversion**: Fixed double conversion issues in chart display
  - Corrected Y-axis values to show actual CLP prices
  - Fixed tooltip display showing proper prices instead of $0
  - Ensured consistent pricing across all chart elements

## v0.25.1 — 2025-01-16
### Bug Fixes
- **Build Process**: Fixed TypeScript compilation errors preventing deployment
  - Excluded `scripts/` directory from TypeScript compilation to prevent build failures
  - Fixed Decimal to number type conversions in server components
  - Resolved type mismatches in pricing display functions across all pages
- **Admin Page Authentication**: Fixed "Failed to load data" error in admin interface
  - Added consistent authentication requirement to `/api/admin/policy` GET route
  - All admin API routes now properly require `x-admin-token` header
  - Admin dashboard now loads successfully with proper error handling

### Improvements
- **Admin Interface**: Enhanced admin page with comprehensive parameter documentation
  - Added collapsible "Parameter Documentation" section explaining all pricing parameters
  - Detailed explanations of currency settings, alpha tiers, pricing rules, and order rules
  - Pricing formula documentation with examples
  - Improved user experience for admin configuration management

## v0.25.0 — 2025-01-16
### Features
- **Complete Pricing System Implementation**: Comprehensive CLP pricing system for Chile market
  - **CLP Currency Support**: Switch display pricing from USD to Chilean Pesos (CLP)
  - **Tiered Markup System**: Configurable alpha tiers based on USD price ranges
    - < 5 USD → 90% markup (alpha = 0.9)
    - 5–20 USD → 70% markup (alpha = 0.7)  
    - > 20 USD → 50% markup (alpha = 0.5)
  - **Pricing Formula**: `FinalPriceCLP = ceil_to_step(max(priceMinPerCardClp, (TCGPriceUSD * FX_CLP * (1 + alpha)) + betaClp), roundToStepClp)`
  - **Per-Card Minimum**: 500 CLP minimum price per card
  - **Rounding System**: Prices rounded up to nearest 500 CLP increments
  - **Daily Shipping Integration**: Beta calculation from daily shipping records

- **Checkout Rules & Validation**: Enhanced cart and checkout experience
  - **Order Minimum**: 10,000 CLP minimum order requirement
  - **Flat Shipping**: 2,500 CLP flat shipping cost
  - **Free Shipping Threshold**: 25,000 CLP threshold for free shipping (configurable)
  - **Progress Banners**: Real-time feedback for minimum order and free shipping progress
  - **Checkout Validation**: Prevents checkout below minimum order with clear messaging

- **Private Admin Interface**: Comprehensive pricing administration
  - **Admin Dashboard** (`/admin/pricing`): Token-protected configuration interface
  - **Configuration Management**: Live editing of all pricing parameters
  - **Daily Shipping Input**: Add/edit daily shipping records for beta calculation
  - **Pricing Preview Tool**: Real-time pricing calculation with detailed breakdown
  - **Bulk Repricing**: Recalculate CLP prices for all cards
  - **Overview Dashboard**: Current settings and system status

- **Database Schema Updates**: New models for pricing system
  - **PricingConfig Model**: Singleton configuration with all pricing parameters
  - **DailyShipping Model**: Daily shipping records for beta calculation
  - **MtgCard Extension**: Added `computedPriceClp` field for cached CLP prices

- **API Routes**: Complete API for pricing operations
  - **GET /api/pricing/preview**: Real-time pricing calculation with breakdown
  - **GET/POST /api/admin/pricing/config**: Configuration management
  - **GET/POST /api/admin/pricing/daily-shipping**: Daily shipping records
  - **POST /api/admin/reprice**: Bulk repricing endpoint
  - **Admin Authentication**: Token-based security for all admin routes

- **Frontend Enhancements**: Updated components for CLP pricing
  - **PricingProvider Context**: Global pricing configuration management
  - **CardTile Updates**: CLP price display with tooltips and currency formatting
  - **Cart Page Enhancements**: Minimum order validation, shipping calculation, progress banners
  - **Currency Formatting**: Chilean peso formatting with es-CL locale
  - **Search Integration**: Updated search services to include computedPriceClp field

- **Developer Experience**: Comprehensive tooling and documentation
  - **Setup Guide**: Step-by-step setup instructions (`SETUP_GUIDE.md`)
  - **Technical Documentation**: Detailed system documentation (`PRICING_SYSTEM_README.md`)
  - **Verification Script**: Automated setup verification (`scripts/verify-pricing-setup.ts`)
  - **Test Suite**: Comprehensive pricing calculation tests (8 passing tests)
  - **Migration Scripts**: Database migration and seeding automation

### Technical Improvements
- **Type Safety**: Full TypeScript support throughout pricing system
- **Performance**: Cached CLP prices for optimal performance
- **Backward Compatibility**: USD prices preserved, graceful fallback when CLP disabled
- **Error Handling**: Comprehensive error handling and validation
- **Logging**: Detailed pricing calculation logging for debugging

### Configuration
- **Environment Variables**: `ADMIN_TOKEN` for admin interface access
- **Default Settings**: Sensible defaults for Chile market
- **Configurable Parameters**: All pricing rules configurable through admin interface
- **Real-time Updates**: Configuration changes apply immediately

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
- **Increased Phase 3 Capacity**: Raised daily limit from 50 to 1000 cards for faster price update coverage

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
