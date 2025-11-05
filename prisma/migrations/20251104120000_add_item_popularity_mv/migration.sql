-- Migration: Add item_popularity_mv materialized view
-- Aggregates sales and cart adds over rolling 30-day window for popularity scoring

-- Create materialized view for item popularity
CREATE MATERIALIZED VIEW IF NOT EXISTS public.item_popularity_mv AS
WITH
sales AS (
  SELECT oi."printingId" AS printing_id,
         COALESCE(SUM(oi."quantity"), 0)::int AS sales_30d
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."createdAt" >= now() - interval '30 days'
    AND (o.status IN ('paid','completed','fulfilled','shipped') OR o.status IS NULL)
  GROUP BY 1
),
cart AS (
  SELECT ci."printingId" AS printing_id,
         COUNT(*)::int AS cart_adds_30d
  FROM "CartItem" ci
  JOIN "Cart" c ON c.id = ci."cartId"
  WHERE ci."createdAt" >= now() - interval '30 days'
  GROUP BY 1
)
SELECT
  COALESCE(s.printing_id, c.printing_id) AS printing_id,
  COALESCE(s.sales_30d, 0) AS sales_30d,
  COALESCE(c.cart_adds_30d, 0) AS cart_adds_30d,
  (COALESCE(s.sales_30d,0) * 1.0
   + COALESCE(c.cart_adds_30d,0) * 0.6)::numeric AS popularity_score,
  now() AS refreshed_at
FROM sales s
FULL OUTER JOIN cart c ON c.printing_id = s.printing_id
WITH NO DATA;

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_popularity_mv_pk
  ON public.item_popularity_mv (printing_id);

-- Ordering index for popularity_score DESC
CREATE INDEX IF NOT EXISTS idx_item_popularity_mv_score
  ON public.item_popularity_mv (popularity_score DESC);

-- Initial population (non-concurrent for first run)
REFRESH MATERIALIZED VIEW public.item_popularity_mv;

