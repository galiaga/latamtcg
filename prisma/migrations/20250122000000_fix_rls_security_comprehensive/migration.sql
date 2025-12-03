-- ============================================================================
-- Comprehensive RLS Security Fix
-- ============================================================================
-- This migration addresses Supabase database linter errors by:
-- 1. Enabling and FORCING RLS on Cart and CartItem tables (they have policies but RLS was disabled)
-- 2. Enabling RLS on all other public tables with appropriate least-privilege policies
-- 3. Fixing SECURITY DEFINER view to use SECURITY INVOKER
--
-- Security Model Summary:
-- - Cart/CartItem: 
--   * Service role: Full access (for Prisma server-side queries)
--   * Authenticated users: Manage own carts (filtered by userId)
--   * Anonymous users: Read-only access to carts with tokens (for anonymous cart support)
-- - kv_state: Service role only (internal state management for ingestion pipelines)
-- - PricingConfig: Public read, service_role write (public configuration)
-- - DailyShipping: Service role only (admin-only data, accessed via server-side API routes)
-- - StorePolicy: Public read, service_role write (public configuration)
-- - Staging tables (scryfall_daily_prices_stage, prices_staging): Service role only (ingestion only)
-- - ingestion_runs: Service role only (audit log for ingestion runs)
-- - PaymentLog: Service role only (payment audit log, accessed via admin routes)
-- - v_card_with_price: SECURITY INVOKER (respects underlying table RLS policies)
-- ============================================================================

-- ============================================================================
-- PART 1: Enable and FORCE RLS on Cart and CartItem
-- ============================================================================
-- These tables have policies defined but RLS was disabled. We enable and FORCE RLS
-- to ensure policies are always enforced, even for service_role connections.

-- Enable RLS on Cart table
ALTER TABLE IF EXISTS public."Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Cart" FORCE ROW LEVEL SECURITY;

-- Enable RLS on CartItem table
ALTER TABLE IF EXISTS public."CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CartItem" FORCE ROW LEVEL SECURITY;

-- Ensure all existing Cart policies exist and are correct
DO $$ 
BEGIN
    -- Service role can manage all carts (for Prisma server-side queries)
    -- Note: When Prisma connects via DATABASE_URL (direct PostgreSQL connection),
    -- it connects as the service_role user. We need to check multiple conditions
    -- because auth.role() may not work correctly in direct connections.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Service role can manage all carts') THEN
        CREATE POLICY "Service role can manage all carts" ON "public"."Cart"
            FOR ALL USING (
                auth.role() = 'service_role' 
                OR (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
                OR current_user IN ('service_role', 'postgres', 'authenticator')
            );
    END IF;
    
    -- Users can view own carts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Users can view own carts') THEN
        CREATE POLICY "Users can view own carts" ON "public"."Cart"
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    
    -- Users can insert own carts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Users can insert own carts') THEN
        CREATE POLICY "Users can insert own carts" ON "public"."Cart"
            FOR INSERT WITH CHECK (auth.uid()::text = "userId");
    END IF;
    
    -- Users can update own carts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Users can update own carts') THEN
        CREATE POLICY "Users can update own carts" ON "public"."Cart"
            FOR UPDATE USING (auth.uid()::text = "userId");
    END IF;
    
    -- Users can delete own carts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Users can delete own carts') THEN
        CREATE POLICY "Users can delete own carts" ON "public"."Cart"
            FOR DELETE USING (auth.uid()::text = "userId");
    END IF;
    
    -- Public can read anonymous carts (carts with token and no userId)
    -- This allows anonymous users to read their cart via token cookie
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Public can read anonymous carts') THEN
        CREATE POLICY "Public can read anonymous carts" ON "public"."Cart"
            FOR SELECT USING (token IS NOT NULL AND "userId" IS NULL);
    END IF;
END $$;

-- Ensure all existing CartItem policies exist and are correct
DO $$ 
BEGIN
    -- Service role can manage all cart items (for Prisma server-side queries)
    -- Note: When Prisma connects via DATABASE_URL (direct PostgreSQL connection),
    -- it connects as the service_role user. We need to check multiple conditions
    -- because auth.role() may not work correctly in direct connections.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CartItem' AND policyname = 'Service role can manage all cart items') THEN
        CREATE POLICY "Service role can manage all cart items" ON "public"."CartItem"
            FOR ALL USING (
                auth.role() = 'service_role' 
                OR (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
                OR current_user IN ('service_role', 'postgres', 'authenticator')
            );
    END IF;
    
    -- Users can view cart items from own carts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CartItem' AND policyname = 'Users can view cart items from own carts') THEN
        CREATE POLICY "Users can view cart items from own carts" ON "public"."CartItem"
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM "public"."Cart" 
                    WHERE "Cart"."id" = "CartItem"."cartId" 
                    AND "Cart"."userId" = auth.uid()::text
                )
            );
    END IF;
    
    -- Users can insert cart items to own carts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CartItem' AND policyname = 'Users can insert cart items to own carts') THEN
        CREATE POLICY "Users can insert cart items to own carts" ON "public"."CartItem"
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM "public"."Cart" 
                    WHERE "Cart"."id" = "CartItem"."cartId" 
                    AND "Cart"."userId" = auth.uid()::text
                )
            );
    END IF;
    
    -- Users can update cart items in own carts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CartItem' AND policyname = 'Users can update cart items in own carts') THEN
        CREATE POLICY "Users can update cart items in own carts" ON "public"."CartItem"
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM "public"."Cart" 
                    WHERE "Cart"."id" = "CartItem"."cartId" 
                    AND "Cart"."userId" = auth.uid()::text
                )
            );
    END IF;
    
    -- Users can delete cart items from own carts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CartItem' AND policyname = 'Users can delete cart items from own carts') THEN
        CREATE POLICY "Users can delete cart items from own carts" ON "public"."CartItem"
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM "public"."Cart" 
                    WHERE "Cart"."id" = "CartItem"."cartId" 
                    AND "Cart"."userId" = auth.uid()::text
                )
            );
    END IF;
    
    -- Public can read anonymous cart items (items in carts with token and no userId)
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

-- ============================================================================
-- PART 2: Enable RLS on other public tables
-- ============================================================================
-- These tables are accessed only via server-side code using Prisma (service_role),
-- so we restrict access to service_role only.

-- kv_state: Service role only (internal state management for ingestion pipelines)
ALTER TABLE IF EXISTS public.kv_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kv_state FORCE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kv_state' AND policyname = 'Service role can manage kv_state') THEN
        CREATE POLICY "Service role can manage kv_state" ON public.kv_state
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- PricingConfig: Public read, service_role write (public configuration)
-- Note: While accessed via /api/pricing/config server-side, we allow public read
-- to match existing behavior and support potential future direct client access.
ALTER TABLE IF EXISTS public."PricingConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PricingConfig" FORCE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Public read access (anon and authenticated can read)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PricingConfig' AND policyname = 'Public can read PricingConfig') THEN
        CREATE POLICY "Public can read PricingConfig" ON public."PricingConfig"
            FOR SELECT USING (true);
    END IF;
    
    -- Service role can manage (write)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PricingConfig' AND policyname = 'Service role can manage PricingConfig') THEN
        CREATE POLICY "Service role can manage PricingConfig" ON public."PricingConfig"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- DailyShipping: Service role only (admin-only data, accessed via server-side API routes)
ALTER TABLE IF EXISTS public."DailyShipping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DailyShipping" FORCE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'DailyShipping' AND policyname = 'Service role can manage DailyShipping') THEN
        CREATE POLICY "Service role can manage DailyShipping" ON public."DailyShipping"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- StorePolicy: Public read, service_role write (public configuration)
-- Note: While accessed via /api/admin/policy server-side, we allow public read
-- to match existing behavior and support potential future direct client access.
ALTER TABLE IF EXISTS public."StorePolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."StorePolicy" FORCE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Public read access (anon and authenticated can read)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'StorePolicy' AND policyname = 'Public can read StorePolicy') THEN
        CREATE POLICY "Public can read StorePolicy" ON public."StorePolicy"
            FOR SELECT USING (true);
    END IF;
    
    -- Service role can manage (write)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'StorePolicy' AND policyname = 'Service role can manage StorePolicy') THEN
        CREATE POLICY "Service role can manage StorePolicy" ON public."StorePolicy"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- scryfall_daily_prices_stage: Service role only (staging table for ingestion)
ALTER TABLE IF EXISTS public.scryfall_daily_prices_stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scryfall_daily_prices_stage FORCE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scryfall_daily_prices_stage' AND policyname = 'Service role can manage scryfall_daily_prices_stage') THEN
        CREATE POLICY "Service role can manage scryfall_daily_prices_stage" ON public.scryfall_daily_prices_stage
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- prices_staging: Service role only (legacy staging table for ingestion)
ALTER TABLE IF EXISTS public.prices_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prices_staging FORCE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prices_staging' AND policyname = 'Service role can manage prices_staging') THEN
        CREATE POLICY "Service role can manage prices_staging" ON public.prices_staging
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ingestion_runs: Service role only (audit log for ingestion runs)
ALTER TABLE IF EXISTS public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ingestion_runs FORCE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ingestion_runs' AND policyname = 'Service role can manage ingestion_runs') THEN
        CREATE POLICY "Service role can manage ingestion_runs" ON public.ingestion_runs
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- PaymentLog: Service role only (payment audit log, accessed via admin routes)
ALTER TABLE IF EXISTS public."PaymentLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PaymentLog" FORCE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PaymentLog' AND policyname = 'Service role can manage PaymentLog') THEN
        CREATE POLICY "Service role can manage PaymentLog" ON public."PaymentLog"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ============================================================================
-- PART 3: Fix SECURITY DEFINER view
-- ============================================================================
-- The view v_card_with_price needs to use SECURITY INVOKER instead of SECURITY DEFINER
-- to respect RLS policies of underlying tables. This ensures queries through the view
-- use the permissions of the querying user, not the view owner.

-- Recreate the view with SECURITY INVOKER explicitly set
-- This ensures the view respects RLS policies of underlying tables (MtgCard and mtgcard_current_price)
CREATE OR REPLACE VIEW public.v_card_with_price 
WITH (security_invoker = true) AS
SELECT c.*, p.price, p.price_at
FROM "MtgCard" c
LEFT JOIN public.mtgcard_current_price p
  ON p.scryfall_id = c."scryfallId"::uuid;

-- NOTE: The view now uses SECURITY INVOKER, which means:
-- - Queries through this view will use the permissions of the querying user (anon/authenticated/service_role)
-- - RLS policies on MtgCard and mtgcard_current_price will be respected
-- - This is the recommended Supabase pattern for views
-- - The view does not bypass RLS, unlike SECURITY DEFINER views

