-- Step 1 — DB: Add compact current price table and helper view

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.mtgcard_current_price (
  scryfall_id uuid NOT NULL,
  finish text NOT NULL CHECK (finish IN ('nonfoil','foil','etched')),
  price numeric(10,2) NOT NULL,
  price_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'scryfall',
  PRIMARY KEY (scryfall_id, finish)
);

-- Index to speed up recent reads
CREATE INDEX IF NOT EXISTS mtgcard_current_price_price_at_idx
  ON public.mtgcard_current_price (price_at DESC);

-- Optional helper view for API queries
CREATE OR REPLACE VIEW public.v_card_with_price AS
SELECT c.*, p.price, p.price_at
FROM "MtgCard" c
LEFT JOIN public.mtgcard_current_price p
  ON p.scryfall_id = c."scryfallId";


