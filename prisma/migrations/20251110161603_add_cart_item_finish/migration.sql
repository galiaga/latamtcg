-- Add finish column to CartItem to distinguish variants (normal, foil, etched)
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "finish" TEXT DEFAULT 'normal';

-- Update existing rows to have 'normal' finish if they're null
UPDATE "CartItem" SET "finish" = 'normal' WHERE "finish" IS NULL;

-- Add unique constraint on (cartId, printingId, finish) to prevent duplicate variants
-- First, remove any potential duplicates by keeping only one per (cartId, printingId, finish) combination
-- Then add the constraint
DO $$ 
BEGIN
  -- Delete duplicates, keeping the one with the highest quantity
  DELETE FROM "CartItem" ci1
  USING "CartItem" ci2
  WHERE ci1.id < ci2.id
    AND ci1."cartId" = ci2."cartId"
    AND ci1."printingId" = ci2."printingId"
    AND COALESCE(ci1."finish", 'normal') = COALESCE(ci2."finish", 'normal');
    
  -- Now add the unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CartItem_cartId_printingId_finish_key'
  ) THEN
    ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_printingId_finish_key" 
      UNIQUE ("cartId", "printingId", "finish");
  END IF;
END $$;

