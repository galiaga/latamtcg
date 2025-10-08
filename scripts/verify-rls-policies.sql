-- RLS Verification Script
-- Run this script after applying the RLS migration to verify all tables have proper security

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Tables in public schema with RLS disabled
-- This query shows any tables that still have RLS disabled
SELECT 
    n.nspname AS schema_name, 
    c.relname AS table_name,
    'RLS DISABLED' AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r' 
  AND c.relrowsecurity = false
ORDER BY 1, 2;

-- 2. Tables in public schema with RLS enabled but NO policies
-- This query shows tables that have RLS enabled but are missing policies
SELECT 
    schemaname, 
    tablename,
    'RLS ENABLED BUT NO POLICIES' AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
      SELECT DISTINCT tablename 
      FROM pg_policies 
      WHERE schemaname = 'public'
  )
  AND tablename NOT LIKE 'pg_%'
ORDER BY 1, 2;

-- 3. Summary of all policies by table
-- This query shows all policies that were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. RLS status summary for all public tables
-- This query shows the RLS status of all tables
SELECT 
    n.nspname AS schema_name,
    c.relname AS table_name,
    CASE 
        WHEN c.relrowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END AS rls_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies p 
            WHERE p.schemaname = n.nspname 
            AND p.tablename = c.relname
        ) THEN 'HAS POLICIES'
        ELSE 'NO POLICIES'
    END AS policy_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
ORDER BY 1, 2;
