-- Add priceUpdatedAt to MtgCard for change timestamps
ALTER TABLE "MtgCard"
  ADD COLUMN IF NOT EXISTS "priceUpdatedAt" timestamptz NULL;

-- History table to track daily price observations per finish
CREATE TABLE IF NOT EXISTS mtgcard_price_history (
  id BIGSERIAL PRIMARY KEY,
  scryfall_id uuid NOT NULL,
  finish text NOT NULL,
  price numeric(10,2) NOT NULL,
  price_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'scryfall'
);

-- Add a separate day key to allow immutable unique index per day
ALTER TABLE mtgcard_price_history
  ADD COLUMN IF NOT EXISTS price_day date;

-- Backfill price_day for any existing rows (if any) to UTC day
UPDATE mtgcard_price_history
SET price_day = (price_at AT TIME ZONE 'UTC')::date
WHERE price_day IS NULL;

-- Avoid duplicates within the same day using price_day
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_price_hist_per_day'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_price_hist_per_day ON mtgcard_price_history (scryfall_id, finish, price_day)';
  END IF;
END$$;

-- Helpful index for queries by card over time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ix_price_hist_card_time'
  ) THEN
    EXECUTE 'CREATE INDEX ix_price_hist_card_time ON mtgcard_price_history (scryfall_id, price_at DESC)';
  END IF;
END$$;


