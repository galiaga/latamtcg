# Database Schema Documentation

**Last Updated:** 2025-10-28 (v0.31.0)

## Overview

This database uses PostgreSQL with Prisma ORM for most models, plus raw SQL tables for price ingestion and staging. The schema supports:
- MTG card catalog with normalized sets
- Current price tracking (compact table)
- Search indexing for fast queries
- User management and e-commerce (carts, orders)
- Pricing configuration for CLP conversion
- Audit logging for price ingestion runs

---

## Core Models (Prisma)

### `MtgCard`
**Primary card catalog table** - Stores individual card printings with pricing and metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key, internal ID |
| `scryfallId` | String (UUID) | Unique Scryfall identifier (used as printing ID) |
| `name` | String | Card name |
| `flavorName` | String? | Flavor name prefix (e.g., "Dwight, Assistant (to the) King") |
| `setCode` | String | Set code (FK to `Set.set_code`) |
| `collectorNumber` | String | Collector number within set |
| `rarity` | String? | Rarity (common, uncommon, rare, mythic) |
| `finishes` | String[] | Array of finishes (nonfoil, foil, etched) |
| `frameEffects` | String[] | Frame effects (borderless, extendedart, showcase, etc.) |
| `promoTypes` | String[] | Promo types (gilded, halo-foil, textured, etc.) |
| `fullArt` | Boolean? | Whether card is full art |
| `borderColor` | String? | Border color |
| `priceUsd` | Decimal(10,2)? | Current USD price (nonfoil) |
| `priceUsdFoil` | Decimal(10,2)? | Current USD price (foil) |
| `priceUsdEtched` | Decimal(10,2)? | Current USD price (etched) |
| `priceEur` | Decimal(10,2)? | EUR price (legacy) |
| `priceTix` | Decimal(10,2)? | Tix price (legacy) |
| `computedPriceClp` | Int? | Cached CLP price (recomputed nightly) |
| `priceUpdatedAt` | DateTime? | When price was last updated |
| `scryfallUpdatedAt` | DateTime? | When Scryfall last updated this card |
| `updatedAt` | DateTime | Last update timestamp |
| `createdAt` | DateTime | Creation timestamp |
| `isPaper` | Boolean | Paper card (vs digital) |
| `lang` | String | Language code (default: "en") |
| `oracleId` | String | Oracle ID for grouping variants |
| `releasedAt` | DateTime? | Set release date |
| `setType` | String? | Set type |

**Relations:**
- `set` → `Set` (via `setCode`)

**Indexes:**
- `oracleId`, `isPaper + lang`, `setCode`, `name`, `oracleId` (idx_mtgcard_oracle), `setCode` (multiple)

---

### `Set`
**Normalized set metadata** - One row per MTG set.

| Column | Type | Description |
|--------|------|-------------|
| `set_code` | String | Primary key, set code (e.g., "LEA", "M21") |
| `set_name` | String | Full set name (e.g., "Limited Edition Alpha") |
| `released_at` | DateTime? | Set release date |
| `set_type` | String? | Set type (expansion, core, etc.) |

**Relations:**
- `cards` → `MtgCard[]` (one-to-many)

---

### `SearchIndex`
**Denormalized search index** - Optimized for fast search queries and suggestions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String | Primary key (MTG uses scryfallId) |
| `groupId` | String | Group ID (MTG uses oracleId) |
| `game` | String | Game identifier ("mtg", "pokemon", etc.) |
| `title` | String | Display title (normalized name) |
| `subtitle` | String | Set code/name + collector number |
| `keywordsText` | String | Normalized keywords for fuzzy search |
| `finishLabel` | String? | Finish label (Nonfoil/Foil/Etched) |
| `variantLabel` | String? | Variant (Borderless/Showcase/Extended Art/etc.) |
| `variantSuffix` | String? | Complete variant suffix (e.g., "(Showcase) (Extended Art) (Foil)") |
| `lang` | String | Language code |
| `isPaper` | Boolean | Physical availability |
| `releasedAt` | DateTime? | Release date for sorting |
| `sortScore` | Float? | Composite ranking score |
| `setCode` | String | Set code |
| `setName` | String? | Set name |
| `collectorNumber` | String | Collector number |
| `imageNormalUrl` | String? | Image URL |
| `name` | String | Card name |
| `nameSortKey` | String? | Precomputed A-Z sort key |
| `nameSortKeyDesc` | String? | Precomputed Z-A sort key |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Indexes:**
- `game + lang + isPaper`, `releasedAt`

---

### `mtgcard_current_price` ⭐ **NEW**
**Compact current price table** - Stores latest price per card+finish (replaces history for current reads).

| Column | Type | Description |
|--------|------|-------------|
| `scryfall_id` | UUID | Foreign key to MtgCard.scryfallId (cast to UUID) |
| `finish` | Text | Finish type: 'nonfoil', 'foil', or 'etched' (CHECK constraint) |
| `price` | Numeric(10,2) | Current price in USD |
| `price_at` | Timestamptz | When this price was recorded |
| `source` | Text | Source identifier (default: 'scryfall') |

**Primary Key:** `(scryfall_id, finish)`

**Indexes:**
- `price_at DESC` (for recent reads)

**RLS:**
- Enabled with read-only policy for `anon` and `authenticated` roles
- Writes must use Service Role key (server-side only)

**View:**
- `v_card_with_price` - Joins `MtgCard` with current prices (LEFT JOIN)

---

### `mtgcard_price_history` ⚠️ **DEPRECATED**
**Historical price tracking** - Daily price observations (being phased out).

> **Status:** Table exists but is no longer written to. Will be dropped after migration verification.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BigInt | Auto-increment primary key |
| `scryfall_id` | UUID | Card identifier |
| `finish` | String | Finish type (normal/foil/etched) |
| `price` | Decimal(10,2) | Price at time |
| `price_at` | Timestamptz | Timestamp |
| `price_day` | Date | Date for daily deduplication |
| `source` | String | Source identifier |

**Unique Constraint:** `(scryfall_id, finish, price_day)`

---

## E-commerce Models

### `User`
**User accounts** - Mirrors Supabase Auth user ID.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (UUID) | Primary key, matches Supabase Auth user ID |
| `email` | String? | Email address (unique) |
| `createdAt` | DateTime | Account creation |
| `updatedAt` | DateTime | Last update |

**Relations:**
- `addresses` → `Address[]`
- `carts` → `Cart[]`
- `orders` → `Order[]`
- `profile` → `Profile?` (one-to-one)

---

### `Profile`
**Extended user profile** - Optional profile data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `userId` | String (UUID) | Foreign key to User.id (unique) |
| `firstName` | String? | First name |
| `lastName` | String? | Last name |
| `phone` | String? | Phone number |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update |

---

### `Cart`
**Shopping carts** - Can be anonymous (token) or user-linked.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `userId` | String? | Foreign key to User.id (nullable for anonymous) |
| `token` | String? | Anonymous cart token (unique, cookie-based) |
| `checkedOutAt` | DateTime? | When cart was checked out |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update |

**Relations:**
- `items` → `CartItem[]`
- `user` → `User?`

**Indexes:**
- `userId`, `checkedOutAt`

---

### `CartItem`
**Cart line items** - Individual items in a cart.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `cartId` | String | Foreign key to Cart.id |
| `printingId` | String | Card printing ID (scryfallId) |
| `quantity` | Int | Quantity (default: 1) |
| `unitPrice` | Decimal(10,2)? | Snapshot price at add time |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update |

**Relations:**
- `cart` → `Cart` (CASCADE delete)

**Indexes:**
- `cartId`, `printingId`

---

### `Order`
**Placed orders** - Finalized purchases.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `userId` | String? | Foreign key to User.id (nullable for guest orders) |
| `email` | String? | Email for guest orders |
| `totalAmount` | Decimal(10,2)? | Total order amount |
| `status` | String | Order status (default: "created") |
| `shippingAddressId` | String? | Foreign key to Address.id |
| `billingAddressId` | String? | Foreign key to Address.id |
| `createdAt` | DateTime | Order timestamp |
| `updatedAt` | DateTime | Last update |

**Relations:**
- `items` → `OrderItem[]`
- `user` → `User?`
- `shippingAddress` → `Address?`
- `billingAddress` → `Address?`

**Indexes:**
- `userId`, `createdAt`

---

### `OrderItem`
**Order line items** - Snapshot of items in an order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `orderId` | String | Foreign key to Order.id |
| `printingId` | String | Card printing ID |
| `quantity` | Int | Quantity |
| `unitPrice` | Decimal(10,2)? | Snapshot price at order time |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update |

**Relations:**
- `order` → `Order` (CASCADE delete)

**Indexes:**
- `orderId`, `printingId`

---

### `Address`
**User addresses** - Shipping and billing addresses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `userId` | String | Foreign key to User.id |
| `label` | String? | Address label (e.g., "Home", "Work") |
| `fullName` | String? | Full name |
| `phone` | String? | Phone number |
| `line1` | String | Street address line 1 |
| `line2` | String? | Street address line 2 |
| `city` | String | City |
| `state` | String? | State/province |
| `postalCode` | String? | Postal/ZIP code |
| `country` | String | Country code |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update |

**Relations:**
- `user` → `User`
- `billingOrders` → `Order[]` (via billingAddressId)
- `shippingOrders` → `Order[]` (via shippingAddressId)

**Indexes:**
- `userId`

---

## Configuration Models

### `PricingConfig`
**Pricing system configuration** - Singleton configuration for CLP pricing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `useCLP` | Boolean | Enable CLP currency display (default: true) |
| `fxClp` | Decimal | USD to CLP exchange rate (default: 950) |
| `alphaTierLowUsd` | Decimal | Low tier threshold (default: 5) |
| `alphaTierMidUsd` | Decimal | Mid tier threshold (default: 20) |
| `alphaLow` | Decimal | Low tier markup (default: 0.9 = 90%) |
| `alphaMid` | Decimal | Mid tier markup (default: 0.7 = 70%) |
| `alphaHigh` | Decimal | High tier markup (default: 0.5 = 50%) |
| `priceMinPerCardClp` | Int | Minimum price per card in CLP (default: 500) |
| `roundToStepClp` | Int | Rounding step in CLP (default: 500) |
| `minOrderSubtotalClp` | Int | Minimum order subtotal (default: 10000) |
| `shippingFlatClp` | Int | Flat shipping cost (default: 2500) |
| `freeShippingThresholdClp` | Int? | Free shipping threshold (default: null = disabled) |
| `updatedAt` | DateTime | Last update |
| `createdAt` | DateTime | Creation timestamp |

---

### `DailyShipping`
**Daily shipping records** - Used for beta CLP calculation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `date` | DateTime | Date (unique) |
| `totalShippingUsd` | Decimal | Total shipping cost in USD |
| `cardsCount` | Int | Number of cards shipped |
| `notes` | String? | Optional notes |
| `createdAt` | DateTime | Creation timestamp |

---

### `StorePolicy`
**Store policy configuration** - Purchase limits and windows.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (CUID) | Primary key |
| `maxCopiesPerItem` | Int | Max copies per item (default: 4) |
| `purchaseWindowDays` | Int | Purchase window in days (default: 3) |
| `updatedAt` | DateTime | Last update |
| `createdAt` | DateTime | Creation timestamp |

---

### `KvMeta`
**Key-value metadata** - Simple key-value store for app metadata.

| Column | Type | Description |
|--------|------|-------------|
| `key` | String | Primary key |
| `value` | String | Value (JSON or text) |
| `updatedAt` | DateTime | Last update |
| `createdAt` | DateTime | Creation timestamp |

---

## Staging & Ingestion Tables (Raw SQL)

### `scryfall_daily_prices_stage`
**Staging table for price ingestion** - Temporary table for bulk CSV imports.

| Column | Type | Description |
|--------|------|-------------|
| `scryfall_id` | UUID | Primary key, card identifier |
| `price_usd` | Numeric(10,2)? | USD price (nonfoil) |
| `price_usd_foil` | Numeric(10,2)? | USD price (foil) |
| `price_usd_etched` | Numeric(10,2)? | USD price (etched) |
| `price_day` | Date | Price date |

**Indexes:**
- `scryfall_id`, `price_day`

**Usage:** Truncated before each ingestion run, populated from CSV, then merged into `MtgCard` and `mtgcard_current_price`.

---

### `prices_staging`
**Legacy staging table** - Alternative staging table (text-based scryfall_id).

| Column | Type | Description |
|--------|------|-------------|
| `scryfall_id` | Text | Primary key |
| `price_usd` | Numeric(10,2)? | USD price (nonfoil) |
| `price_usd_foil` | Numeric(10,2)? | USD price (foil) |
| `price_usd_etched` | Numeric(10,2)? | USD price (etched) |
| `price_day` | Date | Price date |

**Usage:** Used by some legacy scripts; `scryfall_daily_prices_stage` is preferred.

---

### `ingestion_runs`
**Audit log for price ingestion** - Tracks all ingestion runs with metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Serial | Primary key |
| `started_at` | Timestamptz | Run start time |
| `completed_at` | Timestamptz? | Run completion time |
| `status` | Text | Status: 'running', 'completed', 'failed' |
| `price_day` | Date | Price date for this run |
| `download_ms` | Integer? | Download duration (ms) |
| `decompress_ms` | Integer? | Decompression duration (ms) |
| `copy_ms` | Integer? | CSV copy duration (ms) |
| `update_cards_ms` | Integer? | Card update duration (ms) |
| `upsert_history_ms` | Integer? | History upsert duration (ms) |
| `total_ms` | Integer? | Total duration (ms) |
| `rows_in_stage` | Integer? | Rows staged |
| `cards_updated` | Integer? | Cards updated |
| `history_upserts` | Integer? | History records upserted |
| `error_message` | Text? | Error message if failed |

---

## Views

### `v_card_with_price`
**Helper view** - Joins `MtgCard` with current prices from `mtgcard_current_price`.

```sql
SELECT c.*, p.price, p.price_at
FROM "MtgCard" c
LEFT JOIN public.mtgcard_current_price p
  ON p.scryfall_id = c."scryfallId"::uuid;
```

**Note:** The `::uuid` cast handles the case where `MtgCard.scryfallId` is stored as text. If migrated to UUID, remove the cast.

---

## Price Data Flow

### Current Price System (v0.31.0+)

1. **Daily Ingestion:**
   - CSV downloaded from Scryfall (auto) or provided via `--file`
   - Loaded into `scryfall_daily_prices_stage`
   - Merged into `MtgCard` (updates `priceUsd`, `priceUsdFoil`, `priceUsdEtched`)
   - **UPSERTed into `mtgcard_current_price`** (one row per scryfall_id+finish)

2. **Reads:**
   - PDP/API uses `getCurrentPrice()` from `mtgcard_current_price` table
   - Falls back gracefully if price missing (returns null)
   - View `v_card_with_price` available for joins

3. **Local Fallback:**
   - Script: `npm run ingest:prices` (auto-downloads from Scryfall)
   - UPSERT SQL pattern (see `db/maintenance/README.md`)

### Legacy Price History (Deprecated)

- `mtgcard_price_history` table exists but is no longer written to
- Will be dropped after migration verification
- Chart component gated behind `NEXT_PUBLIC_PRICE_HISTORY_ENABLED=false`

---

## Relationships Summary

```
User (1) ──< (N) Cart
User (1) ──< (N) Order
User (1) ──< (N) Address
User (1) ── (1) Profile

Cart (1) ──< (N) CartItem
Order (1) ──< (N) OrderItem
Order (N) ──> (1) Address (shipping/billing)

Set (1) ──< (N) MtgCard
MtgCard (N) ──> (1) Set (via setCode)

MtgCard (1) ──< (N) mtgcard_current_price (via scryfallId)
```

---

## Indexes Summary

### Performance-Critical Indexes

- **MtgCard:** `oracleId`, `isPaper + lang`, `setCode`, `name`
- **SearchIndex:** `game + lang + isPaper`, `releasedAt`
- **mtgcard_current_price:** `price_at DESC`
- **Cart:** `userId`, `checkedOutAt`
- **Order:** `userId`, `createdAt`

### GIN Indexes (for arrays)

- **MtgCard:** `finishes` (array searches)

---

## RLS (Row Level Security)

### Enabled Tables

- `mtgcard_current_price`: Read-only policy for `anon` and `authenticated`
  - Policy: `read_current_price_public` (SELECT only)
  - Writes require Service Role key

### Other Tables

- Most tables rely on application-level authorization
- Supabase Auth handles user authentication

---

## Migration Notes

### Current Price Migration (v0.31.0)

1. ✅ `mtgcard_current_price` table created
2. ✅ View `v_card_with_price` created with UUID cast
3. ✅ RLS enabled on current price table
4. ✅ Backend util `getCurrentPrice()` implemented
5. ✅ PDP feature-flagged (history chart hidden)
6. ⏳ History table to be dropped (after verification)

### Future Considerations

- If `MtgCard.scryfallId` migrates to UUID type, update `v_card_with_price` to remove `::uuid` cast
- Consider dropping `mtgcard_price_history` after verification period
- Monitor `mtgcard_current_price` size (should be ~3x card count due to finishes)

---

## Verification Queries

```sql
-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total
FROM pg_statio_user_tables
WHERE relname IN ('mtgcard_current_price', 'MtgCard', 'SearchIndex')
ORDER BY pg_total_relation_size(relid) DESC;

-- Current price coverage
SELECT finish, COUNT(*) AS count
FROM public.mtgcard_current_price
GROUP BY finish;

-- View test
SELECT id, "scryfallId", price, price_at
FROM public.v_card_with_price
ORDER BY price_at DESC NULLS LAST
LIMIT 5;

-- RLS policy check
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'mtgcard_current_price';
```

---

## Maintenance

See `db/maintenance/README.md` for:
- Current price UPSERT SQL pattern
- Verification queries
- Rollback procedures
- History table cleanup scripts

