-- ============================================================================
-- Fix Cart RLS for Prisma Direct Connections
-- ============================================================================
-- This migration fixes an issue where Prisma queries via DATABASE_URL (direct
-- PostgreSQL connection) were being blocked by RLS policies.
--
-- Problem: When Prisma connects directly to PostgreSQL (not through Supabase API),
-- auth.role() may not return 'service_role' correctly, causing RLS policies to block
-- legitimate Prisma queries.
--
-- Solution: Update service_role policies to check multiple conditions including
-- current_user, which works reliably in direct PostgreSQL connections.
-- ============================================================================

-- Drop and recreate Cart service_role policy with better connection detection
DO $$ 
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Service role can manage all carts" ON "public"."Cart";
    
    -- Create new policy that works with both Supabase API and direct PostgreSQL connections
    CREATE POLICY "Service role can manage all carts" ON "public"."Cart"
        FOR ALL USING (
            -- Check for service_role via Supabase auth (for API connections)
            auth.role() = 'service_role' 
            -- Check for service_role via JWT claims (for API connections)
            OR (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
            -- Check current_user for direct PostgreSQL connections (Prisma)
            OR current_user IN ('service_role', 'postgres', 'authenticator')
        );
END $$;

-- Drop and recreate CartItem service_role policy with better connection detection
DO $$ 
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Service role can manage all cart items" ON "public"."CartItem";
    
    -- Create new policy that works with both Supabase API and direct PostgreSQL connections
    CREATE POLICY "Service role can manage all cart items" ON "public"."CartItem"
        FOR ALL USING (
            -- Check for service_role via Supabase auth (for API connections)
            auth.role() = 'service_role' 
            -- Check for service_role via JWT claims (for API connections)
            OR (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
            -- Check current_user for direct PostgreSQL connections (Prisma)
            OR current_user IN ('service_role', 'postgres', 'authenticator')
        );
END $$;

