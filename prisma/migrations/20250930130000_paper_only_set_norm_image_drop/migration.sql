-- Purge non-paper rows (if any)
DELETE FROM "public"."MtgCard" WHERE "isPaper" = false;

-- Enforce paper-only going forward via CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mtgcard_paper_only_chk'
  ) THEN
    ALTER TABLE "public"."MtgCard"
      ADD CONSTRAINT mtgcard_paper_only_chk CHECK ("isPaper" = true);
  END IF;
END $$;

-- Create normalized Set table
CREATE TABLE IF NOT EXISTS "public"."Set" (
  set_code TEXT PRIMARY KEY,
  set_name TEXT,
  released_at TIMESTAMPTZ NULL,
  type TEXT NULL
);

-- Backfill from existing cards
INSERT INTO "public"."Set" (set_code, set_name, released_at, type)
SELECT t.set_code, t.set_name, t.released_at, t.type
FROM (
  SELECT "setCode" AS set_code,
         MIN("setName") AS set_name,
         MIN("releasedAt") AS released_at,
         MIN("setType") AS type
  FROM "public"."MtgCard"
  GROUP BY "setCode"
) AS t
ON CONFLICT (set_code) DO NOTHING;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_mtgcard_setcode ON "public"."MtgCard"("setCode");
CREATE UNIQUE INDEX IF NOT EXISTS idx_set_pk ON "public"."Set"(set_code);

-- Add FK from MtgCard.setCode -> Set.set_code (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'MtgCard' AND constraint_name = 'fk_mtgcard_set'
  ) THEN
    ALTER TABLE "public"."MtgCard"
      ADD CONSTRAINT fk_mtgcard_set FOREIGN KEY ("setCode") REFERENCES "public"."Set"(set_code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- Drop imageNormalUrl column (now computed on the fly)
ALTER TABLE "public"."MtgCard" DROP COLUMN IF EXISTS "imageNormalUrl";

-- Optional compatibility view: expose resolved setName from Set join
DROP VIEW IF EXISTS "public"."MtgCardWithSetName";
CREATE VIEW "public"."MtgCardWithSetName" AS
SELECT c.*, COALESCE(s.set_name, c."setName") AS "setNameResolved"
FROM "public"."MtgCard" c
LEFT JOIN "public"."Set" s ON s.set_code = c."setCode";

-- Optional compatibility view: compute image URL from scryfallId
DROP VIEW IF EXISTS "public"."MtgCardWithImageUrl";
CREATE VIEW "public"."MtgCardWithImageUrl" AS
SELECT 
  c.*,
  ('https://cards.scryfall.io/normal/front/' || substring(c."scryfallId" FROM 1 FOR 1) || '/' || substring(c."scryfallId" FROM 2 FOR 1) || '/' || c."scryfallId" || '.jpg')
    AS "imageNormalUrl"
FROM "public"."MtgCard" c;

-- Analyze after structural changes
ANALYZE "public"."MtgCard";
ANALYZE "public"."Set";

