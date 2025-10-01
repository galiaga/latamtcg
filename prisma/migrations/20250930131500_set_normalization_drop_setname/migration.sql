-- Create normalized Set table (idempotent)
CREATE TABLE IF NOT EXISTS "public"."Set" (
  set_code TEXT PRIMARY KEY,
  set_name TEXT NOT NULL,
  released_at DATE NULL,
  set_type TEXT NULL
);

-- Align older schema variants: rename legacy column "type" -> "set_type" or add if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Set' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Set' AND column_name = 'set_type'
  ) THEN
    ALTER TABLE "public"."Set" RENAME COLUMN "type" TO set_type;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Set' AND column_name = 'set_type'
  ) THEN
    ALTER TABLE "public"."Set" ADD COLUMN set_type TEXT NULL;
  END IF;
END $$;

-- Backfill from distinct MtgCard pairs
INSERT INTO "public"."Set" (set_code, set_name, released_at, set_type)
SELECT DISTINCT "setCode", COALESCE("setName", ''), CAST("releasedAt" AS DATE), COALESCE("setType", NULL)
FROM "public"."MtgCard"
ON CONFLICT (set_code) DO NOTHING;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_mtgcard_set ON "public"."MtgCard"("setCode");
CREATE UNIQUE INDEX IF NOT EXISTS idx_set_pk ON "public"."Set"(set_code);

-- Add FK from MtgCard.setCode -> Set.set_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'MtgCard' AND constraint_name = 'fk_mtgcard_set_code'
  ) THEN
    ALTER TABLE "public"."MtgCard"
      ADD CONSTRAINT fk_mtgcard_set_code FOREIGN KEY ("setCode") REFERENCES "public"."Set"(set_code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- Drop denormalized column (safe if already removed)
-- First drop any compatibility views that depend on MtgCard.setName
DROP VIEW IF EXISTS "public"."MtgCardWithImageUrl";
DROP VIEW IF EXISTS "public"."MtgCardWithSetName";

ALTER TABLE "public"."MtgCard" DROP COLUMN IF EXISTS "setName";

-- Analyze
ANALYZE "public"."MtgCard";
ANALYZE "public"."Set";


