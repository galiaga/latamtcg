-- Facets Performance Optimization Indexes v2
-- These indexes support candidate-based facet aggregation to avoid full table scans

-- Index for scryfallId lookups (most common case)
CREATE INDEX IF NOT EXISTS idx_mtgcard_scryfall_id_facets
  ON "MtgCard" ("scryfallId") INCLUDE ("setCode", rarity, finishes);

-- Index for set code lookups in facet aggregation
CREATE INDEX IF NOT EXISTS idx_mtgcard_set_code_facets
  ON "MtgCard" ("setCode") INCLUDE (id, rarity, finishes);

-- Index for rarity-based facet filtering
CREATE INDEX IF NOT EXISTS idx_mtgcard_rarity_facets
  ON "MtgCard" (rarity) INCLUDE (id, "setCode", finishes);

-- Index for finishes array operations (GIN doesn't support INCLUDE)
CREATE INDEX IF NOT EXISTS idx_mtgcard_finishes_facets
  ON "MtgCard" USING GIN (finishes);
