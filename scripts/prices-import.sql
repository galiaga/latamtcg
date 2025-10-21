-- Prices import via CSV using a staging table
-- Usage (psql):
--   BEGIN;
--   \copy prices_staging (scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day) FROM './prices.csv' WITH (FORMAT csv, HEADER true);
--   \i scripts/prices-import.sql
--   COMMIT;

-- 1) Staging table
CREATE TABLE IF NOT EXISTS prices_staging (
  scryfall_id uuid PRIMARY KEY,
  price_usd numeric,
  price_usd_foil numeric,
  price_usd_etched numeric,
  price_day date NOT NULL
);

-- 2) Update current prices only when values change
-- normal
UPDATE "MtgCard" mc
SET "priceUsd" = ps.price_usd,
    "priceUpdatedAt" = now()
FROM prices_staging ps
WHERE mc."scryfallId" = ps.scryfall_id
  AND ps.price_usd IS NOT NULL
  AND (mc."priceUsd" IS DISTINCT FROM ps.price_usd);

-- foil
UPDATE "MtgCard" mc
SET "priceUsdFoil" = ps.price_usd_foil,
    "priceUpdatedAt" = now()
FROM prices_staging ps
WHERE mc."scryfallId" = ps.scryfall_id
  AND ps.price_usd_foil IS NOT NULL
  AND (mc."priceUsdFoil" IS DISTINCT FROM ps.price_usd_foil);

-- etched
UPDATE "MtgCard" mc
SET "priceUsdEtched" = ps.price_usd_etched,
    "priceUpdatedAt" = now()
FROM prices_staging ps
WHERE mc."scryfallId" = ps.scryfall_id
  AND ps.price_usd_etched IS NOT NULL
  AND (mc."priceUsdEtched" IS DISTINCT FROM ps.price_usd_etched);

-- 3) Upsert price history for today for any provided price
-- normal
INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
SELECT ps.scryfall_id, 'normal', ps.price_usd, now(), ps.price_day
FROM prices_staging ps
WHERE ps.price_usd IS NOT NULL
ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
SET price = EXCLUDED.price;

-- foil
INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
SELECT ps.scryfall_id, 'foil', ps.price_usd_foil, now(), ps.price_day
FROM prices_staging ps
WHERE ps.price_usd_foil IS NOT NULL
ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
SET price = EXCLUDED.price;

-- etched
INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day)
SELECT ps.scryfall_id, 'etched', ps.price_usd_etched, now(), ps.price_day
FROM prices_staging ps
WHERE ps.price_usd_etched IS NOT NULL
ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE
SET price = EXCLUDED.price;

-- 4) Optional: cleanup staging
-- TRUNCATE TABLE prices_staging;


