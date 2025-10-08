-- Apply RLS Policies Script
-- This script applies all the RLS policies manually

-- ============================================================================
-- USER DATA POLICIES (Owner-based access)
-- ============================================================================

-- User table: Users can only access their own records
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'Users can view own data') THEN
        CREATE POLICY "Users can view own data" ON "public"."User"
            FOR SELECT USING (auth.uid()::text = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'Users can insert own data') THEN
        CREATE POLICY "Users can insert own data" ON "public"."User"
            FOR INSERT WITH CHECK (auth.uid()::text = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'Users can update own data') THEN
        CREATE POLICY "Users can update own data" ON "public"."User"
            FOR UPDATE USING (auth.uid()::text = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'Users can delete own data') THEN
        CREATE POLICY "Users can delete own data" ON "public"."User"
            FOR DELETE USING (auth.uid()::text = id);
    END IF;
END $$;

-- Profile table: Users can only access their own profile
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Profile' AND policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON "public"."Profile"
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Profile' AND policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON "public"."Profile"
            FOR INSERT WITH CHECK (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Profile' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON "public"."Profile"
            FOR UPDATE USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Profile' AND policyname = 'Users can delete own profile') THEN
        CREATE POLICY "Users can delete own profile" ON "public"."Profile"
            FOR DELETE USING (auth.uid()::text = "userId");
    END IF;
END $$;

-- Address table: Users can only access their own addresses
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Address' AND policyname = 'Users can view own addresses') THEN
        CREATE POLICY "Users can view own addresses" ON "public"."Address"
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Address' AND policyname = 'Users can insert own addresses') THEN
        CREATE POLICY "Users can insert own addresses" ON "public"."Address"
            FOR INSERT WITH CHECK (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Address' AND policyname = 'Users can update own addresses') THEN
        CREATE POLICY "Users can update own addresses" ON "public"."Address"
            FOR UPDATE USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Address' AND policyname = 'Users can delete own addresses') THEN
        CREATE POLICY "Users can delete own addresses" ON "public"."Address"
            FOR DELETE USING (auth.uid()::text = "userId");
    END IF;
END $$;

-- Cart table: Users can only access their own carts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Users can view own carts') THEN
        CREATE POLICY "Users can view own carts" ON "public"."Cart"
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Users can insert own carts') THEN
        CREATE POLICY "Users can insert own carts" ON "public"."Cart"
            FOR INSERT WITH CHECK (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Users can update own carts') THEN
        CREATE POLICY "Users can update own carts" ON "public"."Cart"
            FOR UPDATE USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'Users can delete own carts') THEN
        CREATE POLICY "Users can delete own carts" ON "public"."Cart"
            FOR DELETE USING (auth.uid()::text = "userId");
    END IF;
END $$;

-- ============================================================================
-- RELATIONAL POLICIES (Via foreign key relationships)
-- ============================================================================

-- CartItem table: Access via Cart ownership
DO $$ 
BEGIN
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
END $$;

-- Order table: Users can only access their own orders
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Order' AND policyname = 'Users can view own orders') THEN
        CREATE POLICY "Users can view own orders" ON "public"."Order"
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Order' AND policyname = 'Users can insert own orders') THEN
        CREATE POLICY "Users can insert own orders" ON "public"."Order"
            FOR INSERT WITH CHECK (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Order' AND policyname = 'Users can update own orders') THEN
        CREATE POLICY "Users can update own orders" ON "public"."Order"
            FOR UPDATE USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Order' AND policyname = 'Users can delete own orders') THEN
        CREATE POLICY "Users can delete own orders" ON "public"."Order"
            FOR DELETE USING (auth.uid()::text = "userId");
    END IF;
END $$;

-- OrderItem table: Access via Order ownership
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'OrderItem' AND policyname = 'Users can view order items from own orders') THEN
        CREATE POLICY "Users can view order items from own orders" ON "public"."OrderItem"
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM "public"."Order" 
                    WHERE "Order"."id" = "OrderItem"."orderId" 
                    AND "Order"."userId" = auth.uid()::text
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'OrderItem' AND policyname = 'Users can insert order items to own orders') THEN
        CREATE POLICY "Users can insert order items to own orders" ON "public"."OrderItem"
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM "public"."Order" 
                    WHERE "Order"."id" = "OrderItem"."orderId" 
                    AND "Order"."userId" = auth.uid()::text
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'OrderItem' AND policyname = 'Users can update order items in own orders') THEN
        CREATE POLICY "Users can update order items in own orders" ON "public"."OrderItem"
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM "public"."Order" 
                    WHERE "Order"."id" = "OrderItem"."orderId" 
                    AND "Order"."userId" = auth.uid()::text
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'OrderItem' AND policyname = 'Users can delete order items from own orders') THEN
        CREATE POLICY "Users can delete order items from own orders" ON "public"."OrderItem"
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM "public"."Order" 
                    WHERE "Order"."id" = "OrderItem"."orderId" 
                    AND "Order"."userId" = auth.uid()::text
                )
            );
    END IF;
END $$;

-- ============================================================================
-- CATALOG TABLES (Public read access, service-only write)
-- ============================================================================

-- MtgCard table: Public read access, service-only write
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'MtgCard' AND policyname = 'Public can view MtgCard') THEN
        CREATE POLICY "Public can view MtgCard" ON "public"."MtgCard"
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'MtgCard' AND policyname = 'Service role can manage MtgCard') THEN
        CREATE POLICY "Service role can manage MtgCard" ON "public"."MtgCard"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Set table: Public read access, service-only write
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Set' AND policyname = 'Public can view Set') THEN
        CREATE POLICY "Public can view Set" ON "public"."Set"
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Set' AND policyname = 'Service role can manage Set') THEN
        CREATE POLICY "Service role can manage Set" ON "public"."Set"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- SearchIndex table: Public read access, service-only write
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'SearchIndex' AND policyname = 'Public can view SearchIndex') THEN
        CREATE POLICY "Public can view SearchIndex" ON "public"."SearchIndex"
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'SearchIndex' AND policyname = 'Service role can manage SearchIndex') THEN
        CREATE POLICY "Service role can manage SearchIndex" ON "public"."SearchIndex"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- KvMeta table: Public read access, service-only write
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'KvMeta' AND policyname = 'Public can view KvMeta') THEN
        CREATE POLICY "Public can view KvMeta" ON "public"."KvMeta"
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'KvMeta' AND policyname = 'Service role can manage KvMeta') THEN
        CREATE POLICY "Service role can manage KvMeta" ON "public"."KvMeta"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ============================================================================
-- SYSTEM TABLES (Service role only)
-- ============================================================================

-- _prisma_migrations table: Service role only
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '_prisma_migrations' AND policyname = 'Service role can manage migrations') THEN
        CREATE POLICY "Service role can manage migrations" ON "public"."_prisma_migrations"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Revoke all permissions from anon and authenticated roles on _prisma_migrations
REVOKE ALL ON "public"."_prisma_migrations" FROM anon;
REVOKE ALL ON "public"."_prisma_migrations" FROM authenticated;
