-- ============================================================================
-- Fix RLS Security Issues
-- ============================================================================
-- This migration addresses Supabase database linter errors by:
-- 1. Enabling and FORCING RLS on Cart and CartItem tables
-- 2. Enabling RLS on all other public tables with appropriate policies
-- 3. Fixing SECURITY DEFINER view to use SECURITY INVOKER
--
-- Security Model Summary:
-- - Cart/CartItem: Users can manage own carts, service_role can manage all,
--   anonymous users can read carts with tokens
-- - kv_state: Service role only (internal state management)
-- - PricingConfig: Public read, service_role write (public config)
-- - DailyShipping: Service role only (admin-only data)
-- - StorePolicy: Public read, service_role write (public config)
-- - Staging tables (scryfall_daily_prices_stage, prices_staging): Service role only
-- - ingestion_runs: Service role only (audit log)
-- - PaymentLog: Service role only (payment audit log)
-- - v_card_with_price: SECURITY INVOKER (respects underlying table RLS)
-- ============================================================================

-- ============================================================================
-- PART 1: Enable and FORCE RLS on Cart and CartItem
-- ============================================================================

-- Enable RLS on Cart table
ALTER TABLE public."Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cart" FORCE ROW LEVEL SECURITY;

-- Enable RLS on CartItem table
ALTER TABLE public."CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CartItem" FORCE ROW LEVEL SECURITY;

-- Ensure all existing Cart policies exist
DO $$ 
BEGIN
    -- Service role can manage all carts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Service role can manage all carts') THEN
        CREATE POLICY "Service role can manage all carts" ON "public"."Cart"
            FOR ALL USING (auth.role() = 'service_role');
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
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Public can read anonymous carts') THEN
        CREATE POLICY "Public can read anonymous carts" ON "public"."Cart"
            FOR SELECT USING (token IS NOT NULL AND "userId" IS NULL);
    END IF;
END $$;

-- Ensure all existing CartItem policies exist
DO $$ 
BEGIN
    -- Service role can manage all cart items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CartItem' AND policyname = 'Service role can manage all cart items') THEN
        CREATE POLICY "Service role can manage all cart items" ON "public"."CartItem"
            FOR ALL USING (auth.role() = 'service_role');
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
    
    -- Public can read anonymous cart items
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

-- DailyShipping: Service role only (admin-only data)
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

-- PaymentLog: Service role only (payment audit log)
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

-- Recreate the view with SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures the view respects RLS policies of underlying tables
CREATE OR REPLACE VIEW public.v_card_with_price 
WITH (security_invoker = true) AS
SELECT c.*, p.price, p.price_at
FROM "MtgCard" c
LEFT JOIN public.mtgcard_current_price p
  ON p.scryfall_id = c."scryfallId"::uuid;

-- NOTE: The view now uses SECURITY INVOKER, which means:
-- - Queries through this view will use the permissions of the querying user
-- - RLS policies on MtgCard and mtgcard_current_price will be respected
-- - This is the recommended Supabase pattern for views

