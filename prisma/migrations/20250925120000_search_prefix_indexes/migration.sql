-- Text search indices for fast prefix-of-word matching and trigram fallback

-- Enable necessary extension (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- GIN on normalized tsvector of title
-- Use only immutable functions in index expressions (lower is immutable)
CREATE INDEX IF NOT EXISTS idx_searchindex_title_tsv
  ON "public"."SearchIndex"
  USING GIN (to_tsvector('simple', lower(title)));

-- Trigram on normalized title as fallback for fuzzy/prefix
CREATE INDEX IF NOT EXISTS idx_searchindex_title_trgm
  ON "public"."SearchIndex"
  USING GIN (lower(title) gin_trgm_ops);


