-- Performance optimization for search suggestions
-- Composite index for common suggestion query patterns

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Composite index for suggestions query pattern
-- Covers: game, isPaper, lang, title prefix, and releasedAt for sorting
CREATE INDEX IF NOT EXISTS idx_searchindex_suggestions_composite
  ON "public"."SearchIndex" (game, "isPaper", lang, "releasedAt" DESC)
  WHERE "isPaper" = true;

-- Partial index for English-only suggestions (most common case)
CREATE INDEX IF NOT EXISTS idx_searchindex_suggestions_en
  ON "public"."SearchIndex" (game, "releasedAt" DESC, title)
  WHERE "isPaper" = true AND lang = 'en';

-- GIN index on title for fast prefix matching
CREATE INDEX IF NOT EXISTS idx_searchindex_title_prefix
  ON "public"."SearchIndex"
  USING GIN (unaccent(lower(title)) gin_trgm_ops);

-- Update table statistics
ANALYZE "public"."SearchIndex";
