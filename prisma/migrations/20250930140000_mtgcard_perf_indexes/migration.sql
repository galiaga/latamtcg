-- Performance indexes for cold search path
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram on MtgCard.name for prefix/fuzzy matches
CREATE INDEX IF NOT EXISTS idx_mtgcard_name_trgm
  ON "public"."MtgCard"
  USING GIN (name gin_trgm_ops);

-- Composite partial index for common filters and sorts
CREATE INDEX IF NOT EXISTS idx_mtgcard_core_partial
  ON "public"."MtgCard"("setCode", "rarity", "releasedAt")
  WHERE "isPaper" = true AND lang = 'en';

-- Ensure oracleId index exists (Prisma schema also defines one, but safe here)
CREATE INDEX IF NOT EXISTS idx_mtgcard_oracle
  ON "public"."MtgCard"("oracleId");

-- GIN index on finishes (text[])
CREATE INDEX IF NOT EXISTS idx_mtgcard_finishes_gin
  ON "public"."MtgCard"
  USING GIN ("finishes");

-- Btree indexes to support price sorting (non-null values first)
CREATE INDEX IF NOT EXISTS idx_mtgcard_price_usd
  ON "public"."MtgCard" ("priceUsd")
  WHERE "isPaper" = true AND lang = 'en' AND "priceUsd" IS NOT NULL AND "priceUsd" <> 0;

CREATE INDEX IF NOT EXISTS idx_mtgcard_price_usd_foil
  ON "public"."MtgCard" ("priceUsdFoil")
  WHERE "isPaper" = true AND lang = 'en' AND "priceUsdFoil" IS NOT NULL AND "priceUsdFoil" <> 0;

CREATE INDEX IF NOT EXISTS idx_mtgcard_price_usd_etched
  ON "public"."MtgCard" ("priceUsdEtched")
  WHERE "isPaper" = true AND lang = 'en' AND "priceUsdEtched" IS NOT NULL AND "priceUsdEtched" <> 0;

-- Analyze after new indexes
ANALYZE "public"."MtgCard";


