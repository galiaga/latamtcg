-- Enable required extensions for fuzzy/prefix search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create SearchIndex table
CREATE TABLE IF NOT EXISTS "public"."SearchIndex" (
  "id" TEXT PRIMARY KEY,
  "groupId" TEXT NOT NULL,
  "game" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "keywordsText" TEXT NOT NULL,
  "finishLabel" TEXT,
  "variantLabel" TEXT,
  "lang" TEXT NOT NULL,
  "isPaper" BOOLEAN NOT NULL DEFAULT TRUE,
  "releasedAt" TIMESTAMP(3),
  "sortScore" DOUBLE PRECISION,
  "setCode" TEXT NOT NULL,
  "setName" TEXT,
  "collectorNumber" TEXT NOT NULL,
  "imageNormalUrl" TEXT,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Supporting btree indexes
CREATE INDEX IF NOT EXISTS "SearchIndex_game_lang_paper_idx" ON "public"."SearchIndex" ("game", "lang", "isPaper");
CREATE INDEX IF NOT EXISTS "SearchIndex_releasedAt_idx" ON "public"."SearchIndex" ("releasedAt");
CREATE INDEX IF NOT EXISTS "SearchIndex_setCode_idx" ON "public"."SearchIndex" ("setCode");

-- Trigram for prefix/fuzzy on title and keywords
CREATE INDEX IF NOT EXISTS "SearchIndex_title_trgm" ON "public"."SearchIndex" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "SearchIndex_keywords_trgm" ON "public"."SearchIndex" USING GIN ("keywordsText" gin_trgm_ops);

-- Full text on unaccented, lowercased keywords
-- Since keywordsText is already lowercased and diacritics-stripped by the builder,
-- we can index directly on to_tsvector(simple, keywordsText)
CREATE INDEX IF NOT EXISTS "SearchIndex_keywords_tsv" ON "public"."SearchIndex"
USING GIN (to_tsvector('simple', "keywordsText"));


