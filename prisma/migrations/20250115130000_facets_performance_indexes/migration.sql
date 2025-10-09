-- Facets Performance Optimization Indexes
-- These indexes support candidate-based facet aggregation to avoid full table scans

-- Covering index for printing table to avoid heap lookups during facet computation
-- Includes all columns needed for facet aggregation: setCode, rarity, finishes
CREATE INDEX IF NOT EXISTS idx_mtgcard_facets_cover
  ON "MtgCard" (id) INCLUDE ("setCode", rarity, finishes);

-- Index for SearchIndex to MtgCard joins during candidate resolution
-- This supports the JOIN from SearchIndex.id to MtgCard.scryfallId
CREATE INDEX IF NOT EXISTS idx_mtgcard_scryfall_lookup
  ON "MtgCard" ("scryfallId") INCLUDE (id, "setCode", rarity, finishes);

-- Additional index for set code lookups in facet aggregation
CREATE INDEX IF NOT EXISTS idx_mtgcard_set_code
  ON "MtgCard" ("setCode") INCLUDE (id, rarity, finishes);

-- Index for rarity-based facet filtering
CREATE INDEX IF NOT EXISTS idx_mtgcard_rarity
  ON "MtgCard" (rarity) INCLUDE (id, "setCode", finishes);
