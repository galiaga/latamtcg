-- 1) Ensure the view joins even if MtgCard.scryfallId is text
CREATE OR REPLACE VIEW public.v_card_with_price AS
SELECT c.*, p.price, p.price_at
FROM "MtgCard" c
LEFT JOIN public.mtgcard_current_price p
  ON p.scryfall_id = c."scryfallId"::uuid;

-- NOTE: If later we migrate "MtgCard"."scryfallId" to UUID, replace the JOIN with:
--   ON p.scryfall_id = c."scryfallId"
-- and remove the ::uuid cast.

-- 2) Enable RLS on current price table and grant read-only to anon/auth
ALTER TABLE public.mtgcard_current_price ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'mtgcard_current_price'
      AND policyname = 'read_current_price_public'
  ) THEN
    CREATE POLICY "read_current_price_public"
    ON public.mtgcard_current_price
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- Do not create any INSERT/UPDATE policies; writes must only happen from server code with the Service Role key.


