-- Create staging table for daily price ingestion
CREATE TABLE IF NOT EXISTS scryfall_daily_prices_stage (
  scryfall_id uuid NOT NULL,
  price_usd numeric(10,2) NULL,
  price_usd_foil numeric(10,2) NULL,
  price_usd_etched numeric(10,2) NULL,
  price_day date NOT NULL
);

-- Add unique index for idempotency on price history
CREATE UNIQUE INDEX IF NOT EXISTS uq_price_hist_day
  ON mtgcard_price_history (scryfall_id, finish, price_day);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scryfall_stage_scryfall_id 
  ON scryfall_daily_prices_stage (scryfall_id);

CREATE INDEX IF NOT EXISTS idx_scryfall_stage_price_day 
  ON scryfall_daily_prices_stage (price_day);
