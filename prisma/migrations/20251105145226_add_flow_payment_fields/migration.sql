-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "amountCLP" INTEGER,
ADD COLUMN "flowToken" TEXT,
ADD COLUMN "flowOrder" TEXT,
ADD COLUMN "flowPaymentId" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "metadata" JSONB;

-- Drop materialized view that depends on Order.status
DROP MATERIALIZED VIEW IF EXISTS public.item_popularity_mv CASCADE;

-- Change status column from String to OrderStatus enum
-- First, set default value for existing rows
UPDATE "Order" SET "status" = 'created' WHERE "status" IS NULL OR "status" = '';

-- Create a temporary column with the new enum type
ALTER TABLE "Order" ADD COLUMN "status_new" "OrderStatus" DEFAULT 'pending';

-- Map existing status values to new enum
UPDATE "Order" SET "status_new" = 
  CASE 
    WHEN "status" IN ('created', 'pending') THEN 'pending'::"OrderStatus"
    WHEN "status" IN ('paid', 'completed', 'fulfilled', 'shipped') THEN 'paid'::"OrderStatus"
    WHEN "status" IN ('failed', 'rejected') THEN 'failed'::"OrderStatus"
    WHEN "status" = 'cancelled' THEN 'cancelled'::"OrderStatus"
    ELSE 'pending'::"OrderStatus"
  END;

-- Drop old column and rename new one
ALTER TABLE "Order" DROP COLUMN "status";
ALTER TABLE "Order" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Order" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_flowToken_key" ON "Order"("flowToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_flowToken_idx" ON "Order"("flowToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentLog_orderId_idx" ON "PaymentLog"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentLog_createdAt_idx" ON "PaymentLog"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentLog_event_idx" ON "PaymentLog"("event");

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate materialized view with updated status enum
CREATE MATERIALIZED VIEW IF NOT EXISTS public.item_popularity_mv AS
WITH
sales AS (
  SELECT oi."printingId" AS printing_id,
         COALESCE(SUM(oi."quantity"), 0)::int AS sales_30d
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."createdAt" >= now() - interval '30 days'
    AND o.status = 'paid'::"OrderStatus"
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

