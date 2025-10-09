-- Search Performance Optimization Migration
-- Addresses the 20+ second query times for complex searches

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Composite index for the most common search pattern
-- Covers: game='mtg', isPaper=true, lang='en'
CREATE INDEX IF NOT EXISTS idx_searchindex_mtg_paper_en_composite
  ON "public"."SearchIndex" (game, "isPaper", lang)
  WHERE game = 'mtg' AND "isPaper" = true AND lang = 'en';

-- 2. Covering index for SearchIndex -> MtgCard joins
-- Includes all columns needed for the main search query to avoid heap lookups
CREATE INDEX IF NOT EXISTS idx_searchindex_covering
  ON "public"."SearchIndex" (id) 
  INCLUDE (title, subtitle, "imageNormalUrl", "setCode", "setName", "collectorNumber", 
           "variantLabel", "finishLabel", "variantSuffix", "releasedAt", "groupId");

-- 3. Optimized MtgCard index for scryfallId lookups with price data
-- Includes all price columns to avoid additional lookups
CREATE INDEX IF NOT EXISTS idx_mtgcard_scryfall_covering
  ON "public"."MtgCard" ("scryfallId")
  INCLUDE ("priceUsd", "priceUsdFoil", "priceUsdEtched", rarity, finishes, "setCode");

-- 4. Partial index for available cards only (most common case)
-- Speeds up queries that filter by price availability
CREATE INDEX IF NOT EXISTS idx_mtgcard_available_paper
  ON "public"."MtgCard" ("scryfallId", "setCode", rarity)
  WHERE "isPaper" = true AND lang = 'en' 
    AND ("priceUsd" IS NOT NULL OR "priceUsdFoil" IS NOT NULL OR "priceUsdEtched" IS NOT NULL);

-- 5. Set table optimization for case-insensitive lookups
CREATE INDEX IF NOT EXISTS idx_set_code_upper
  ON "public"."Set" (upper(set_code));

-- 6. Optimized index for groupId searches (when filtering by specific card groups)
CREATE INDEX IF NOT EXISTS idx_searchindex_groupid_mtg
  ON "public"."SearchIndex" ("groupId", game, "isPaper")
  WHERE game = 'mtg' AND "isPaper" = true;

-- 7. Additional trigram index on title for faster text searches
CREATE INDEX IF NOT EXISTS idx_searchindex_title_trgm_optimized
  ON "public"."SearchIndex"
  USING GIN (title gin_trgm_ops)
  WHERE game = 'mtg' AND "isPaper" = true;

-- Update table statistics for better query planning
ANALYZE "public"."SearchIndex";
ANALYZE "public"."MtgCard";
ANALYZE "public"."Set";
