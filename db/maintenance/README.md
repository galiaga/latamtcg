# Database Maintenance Tasks

## Current Price Table (read-only via RLS)

- `public.mtgcard_current_price` stores the latest price per `(scryfall_id, finish)`.
- RLS is enabled with a read-only policy for `anon` and `authenticated` roles; no client writes allowed.
- Writes should be performed only by server jobs using the Service Role.

### View join and future UUID migration

The helper view casts `MtgCard."scryfallId"` to UUID to join safely even if stored as text:

```sql
CREATE OR REPLACE VIEW public.v_card_with_price AS
SELECT c.*, p.price, p.price_at
FROM "MtgCard" c
LEFT JOIN public.mtgcard_current_price p
  ON p.scryfall_id = c."scryfallId"::uuid;
```

If/when `MtgCard."scryfallId"` becomes a UUID column, update the view to:

```sql
ON p.scryfall_id = c."scryfallId"
```

### Local daily UPSERT (service role)

Use this statement from a server context with the Service Role key:

```sql
INSERT INTO public.mtgcard_current_price (scryfall_id, finish, price, price_at, source)
VALUES ($1::uuid, $2::text, $3::numeric, $4::timestamptz, 'scryfall')
ON CONFLICT (scryfall_id, finish) DO UPDATE
  SET price = EXCLUDED.price,
      price_at = EXCLUDED.price_at,
      source = EXCLUDED.source;
```

### Verification

```sql
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total
FROM pg_statio_user_tables
WHERE relname IN ('mtgcard_current_price')
ORDER BY pg_total_relation_size(relid) DESC;

SELECT id, "scryfallId", price, price_at
FROM public.v_card_with_price
ORDER BY price_at DESC NULLS LAST
LIMIT 5;
```

### Rollback

- To re-enable the history chart: set `NEXT_PUBLIC_PRICE_HISTORY_ENABLED=true` and redeploy.
- If price history is needed again, recreate the former table and writer; the `mtgcard_current_price` flow remains independent.

## Price History Pruning (30 Days)

This maintenance task keeps the `public.mtgcard_price_history` table lean by retaining only the last 30 days of price data.

### Configuration Flags

Set these database settings to control the maintenance behavior:

```bash
-- Prisma migrations run inside a transaction, so we control behavior using
-- Postgres GUCs (database settings) read by the migration.

-- One-time backup of rows older than 30 days (default: off)
ALTER DATABASE postgres SET app.settings.backup_enabled = 'true';
-- later, disable it again (recommended):
ALTER DATABASE postgres RESET app.settings.backup_enabled;

-- For VACUUM FULL, run it manually after deploy (see section below).
```

### Verification Queries

Run these queries before and after maintenance to verify the changes:

```sql
-- Table & index sizes
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total,
  pg_size_pretty(pg_relation_size(relid)) AS table_only,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS indexes
FROM pg_catalog.pg_statio_user_tables
WHERE relname IN ('mtgcard_price_history')
ORDER BY pg_total_relation_size(relid) DESC;

-- Row count & date range
SELECT COUNT(*) AS rows,
       MIN(price_at) AS oldest,
       MAX(price_at) AS newest
FROM public.mtgcard_price_history;

-- Verify pg_cron job
SELECT * FROM cron.job WHERE jobname = 'prune-mtg-price-history-30d';
```

### Legacy Rollback Plan (history table)

If you need to restore data or revert changes:

1. Disable the cron job:
```sql
SELECT cron.unschedule('prune-mtg-price-history-30d');
```

2. If backup was created, restore data:
```sql
-- Only if BACKUP_ENABLED was true
INSERT INTO public.mtgcard_price_history 
SELECT * FROM public.mtgcard_price_history_backup
WHERE NOT EXISTS (
  SELECT 1 FROM public.mtgcard_price_history ph 
  WHERE ph.scryfall_id = mtgcard_price_history_backup.scryfall_id
  AND ph.finish = mtgcard_price_history_backup.finish
  AND ph.price_day = mtgcard_price_history_backup.price_day
);
```

3. Recreate original indexes if needed:
```sql
-- Original composite index
CREATE INDEX IF NOT EXISTS ix_price_hist_card_time 
ON public.mtgcard_price_history(scryfall_id, price_at DESC);
```

### Index Changes

The migration replaces the existing composite index with more efficient ones:

- Added:
  - `mtgcard_price_history_price_at_brin`: BRIN index on price_at for efficient date range queries
  - `mtgcard_price_history_scryfall_id_idx`: BTREE index on scryfall_id for card lookups

- Removed:
  - `ix_price_hist_card_time`: Composite index (scryfall_id, price_at DESC) replaced by separate indexes

The new index strategy provides better space efficiency while maintaining query performance for common access patterns.
