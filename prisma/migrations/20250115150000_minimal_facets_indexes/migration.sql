-- Minimal Facets Performance Indexes
-- These indexes support candidate-based facet aggregation

-- Index for scryfallId lookups (most common case)
CREATE INDEX IF NOT EXISTS idx_mtgcard_scryfall_id ON "MtgCard" ("scryfallId");

-- Index for set code lookups in facet aggregation
CREATE INDEX IF NOT EXISTS idx_mtgcard_set_code ON "MtgCard" ("setCode");

-- Index for rarity-based facet filtering
CREATE INDEX IF NOT EXISTS idx_mtgcard_rarity ON "MtgCard" (rarity);

-- Only add GIN index for finishes if it's text[] and frequently used
-- CREATE INDEX IF NOT EXISTS idx_mtgcard_finishes_gin ON "MtgCard" USING GIN (finishes);
