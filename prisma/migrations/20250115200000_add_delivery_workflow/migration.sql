-- CreateEnum (only if it doesn't exist)
DO $$ BEGIN
  CREATE TYPE "DeliveryMethod" AS ENUM ('pickup', 'courier');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (only if it doesn't exist)
DO $$ BEGIN
  CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'preparing', 'shipped', 'delivered', 'ready_for_pickup', 'picked_up');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add delivery fields to Order
ALTER TABLE "Order" 
  ADD COLUMN IF NOT EXISTS "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'courier',
  ADD COLUMN IF NOT EXISTS "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "shippingCourier" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCost" INTEGER,
  ADD COLUMN IF NOT EXISTS "shippingRegion" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressLine1" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressLine2" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCity" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCommune" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingPostalCode" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingInstructions" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingCode" TEXT,
  ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pickupNotes" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_deliveryMethod_idx" ON "Order"("deliveryMethod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_deliveryStatus_idx" ON "Order"("deliveryStatus");

