-- Fix Cart RLS Policies for Service Role Access
-- This migration adds policies to allow the service role to manage carts and cart items
-- which is necessary because Prisma API routes connect via service role

-- ============================================================================
-- CART RLS POLICIES - Allow Service Role Access
-- ============================================================================

-- Cart table: Allow service role to manage all carts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Service role can manage all carts') THEN
        CREATE POLICY "Service role can manage all carts" ON "public"."Cart"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- CartItem table: Allow service role to manage all cart items
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CartItem' AND policyname = 'Service role can manage all cart items') THEN
        CREATE POLICY "Service role can manage all cart items" ON "public"."CartItem"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Also add public read access for anonymous carts (carts with token and no userId)
DO $$ 
BEGIN
    -- Allow reading carts that have a token (anonymous carts)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Public can read anonymous carts') THEN
        CREATE POLICY "Public can read anonymous carts" ON "public"."Cart"
            FOR SELECT USING (token IS NOT NULL AND "userId" IS NULL);
    END IF;
END $$;

-- Allow reading cart items that belong to anonymous carts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CartItem' AND policyname = 'Public can read anonymous cart items') THEN
        CREATE POLICY "Public can read anonymous cart items" ON "public"."CartItem"
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM "public"."Cart" 
                    WHERE "Cart"."id" = "CartItem"."cartId" 
                    AND "Cart"."token" IS NOT NULL 
                    AND "Cart"."userId" IS NULL
                )
            );
    END IF;
END $$;

