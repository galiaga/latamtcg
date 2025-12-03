# RLS Security Fix Summary

## Overview

This document summarizes the RLS (Row Level Security) fixes applied in migration `20250122000000_fix_rls_security_comprehensive` to address Supabase database linter errors.

## Migration File

**Location:** `prisma/migrations/20250122000000_fix_rls_security_comprehensive/migration.sql`

## Changes Made

### 1. Cart and CartItem Tables

**Issue:** Tables had RLS policies defined but RLS was disabled.

**Fix:**
- Enabled RLS and FORCED RLS on both tables
- Ensured all existing policies are in place:
  - Service role: Full access (for Prisma server-side queries)
  - Authenticated users: Manage own carts (filtered by userId)
  - Anonymous users: Read-only access to carts with tokens

**Policies Created/Verified:**
- `Service role can manage all carts` / `Service role can manage all cart items`
- `Users can view own carts` / `Users can view cart items from own carts`
- `Users can insert own carts` / `Users can insert cart items to own carts`
- `Users can update own carts` / `Users can update cart items in own carts`
- `Users can delete own carts` / `Users can delete cart items from own carts`
- `Public can read anonymous carts` / `Public can read anonymous cart items`

### 2. Other Public Tables

**Issue:** Tables in public schema had RLS disabled.

**Fix:** Enabled RLS and FORCED RLS on all tables with appropriate policies:

#### kv_state
- **Access:** Service role only
- **Reason:** Internal state management for ingestion pipelines
- **Policy:** `Service role can manage kv_state` (ALL operations)

#### PricingConfig
- **Access:** Public read, service_role write
- **Reason:** Public configuration, accessed via `/api/pricing/config` server-side
- **Policies:**
  - `Public can read PricingConfig` (SELECT only)
  - `Service role can manage PricingConfig` (ALL operations)

#### DailyShipping
- **Access:** Service role only
- **Reason:** Admin-only data, accessed via `/api/admin/pricing/daily-shipping` server-side
- **Policy:** `Service role can manage DailyShipping` (ALL operations)

#### StorePolicy
- **Access:** Public read, service_role write
- **Reason:** Public configuration, accessed via `/api/admin/policy` server-side
- **Policies:**
  - `Public can read StorePolicy` (SELECT only)
  - `Service role can manage StorePolicy` (ALL operations)

#### scryfall_daily_prices_stage
- **Access:** Service role only
- **Reason:** Staging table for ingestion pipelines
- **Policy:** `Service role can manage scryfall_daily_prices_stage` (ALL operations)

#### prices_staging
- **Access:** Service role only
- **Reason:** Legacy staging table for ingestion
- **Policy:** `Service role can manage prices_staging` (ALL operations)

#### ingestion_runs
- **Access:** Service role only
- **Reason:** Audit log for ingestion runs
- **Policy:** `Service role can manage ingestion_runs` (ALL operations)

#### PaymentLog
- **Access:** Service role only
- **Reason:** Payment audit log, accessed via admin routes
- **Policy:** `Service role can manage PaymentLog` (ALL operations)

### 3. View Security Fix

**Issue:** View `v_card_with_price` was flagged as using SECURITY DEFINER.

**Fix:** Recreated the view with `SECURITY INVOKER` explicitly set.

**Impact:**
- View now respects RLS policies of underlying tables (`MtgCard` and `mtgcard_current_price`)
- Queries through the view use the permissions of the querying user
- Follows Supabase best practices for views

## Access Matrix

### Cart Table
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| service_role | ✅ All | ✅ All | ✅ All | ✅ All |
| authenticated | ✅ Own only | ✅ Own only | ✅ Own only | ✅ Own only |
| anon | ✅ Anonymous carts only | ❌ | ❌ | ❌ |

### CartItem Table
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| service_role | ✅ All | ✅ All | ✅ All | ✅ All |
| authenticated | ✅ Own carts only | ✅ Own carts only | ✅ Own carts only | ✅ Own carts only |
| anon | ✅ Anonymous carts only | ❌ | ❌ | ❌ |

### kv_state Table
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| service_role | ✅ | ✅ | ✅ | ✅ |
| authenticated | ❌ | ❌ | ❌ | ❌ |
| anon | ❌ | ❌ | ❌ | ❌ |

### PricingConfig Table
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| service_role | ✅ | ✅ | ✅ | ✅ |
| authenticated | ✅ | ❌ | ❌ | ❌ |
| anon | ✅ | ❌ | ❌ | ❌ |

### DailyShipping Table
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| service_role | ✅ | ✅ | ✅ | ✅ |
| authenticated | ❌ | ❌ | ❌ | ❌ |
| anon | ❌ | ❌ | ❌ | ❌ |

### StorePolicy Table
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| service_role | ✅ | ✅ | ✅ | ✅ |
| authenticated | ✅ | ❌ | ❌ | ❌ |
| anon | ✅ | ❌ | ❌ | ❌ |

### Staging Tables (scryfall_daily_prices_stage, prices_staging, ingestion_runs)
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| service_role | ✅ | ✅ | ✅ | ✅ |
| authenticated | ❌ | ❌ | ❌ | ❌ |
| anon | ❌ | ❌ | ❌ | ❌ |

### PaymentLog Table
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| service_role | ✅ | ✅ | ✅ | ✅ |
| authenticated | ❌ | ❌ | ❌ | ❌ |
| anon | ❌ | ❌ | ❌ | ❌ |

## Testing Recommendations

After applying this migration, test the following flows:

1. **Cart Operations:**
   - ✅ Anonymous user can view cart via token cookie
   - ✅ Authenticated user can manage own cart
   - ✅ Server-side API routes can manage carts (via Prisma/service_role)

2. **Public Configuration:**
   - ✅ PricingConfig is readable by all (via API routes)
   - ✅ StorePolicy is readable by all (via API routes)

3. **Admin Operations:**
   - ✅ Admin routes can access DailyShipping, PaymentLog (via service_role)
   - ✅ Ingestion scripts can access staging tables (via service_role)

4. **View Usage:**
   - ✅ `v_card_with_price` view respects RLS policies
   - ✅ Queries through view work for all roles

## Notes

- All policies use `IF NOT EXISTS` checks to be idempotent
- Migration preserves existing behavior (no breaking changes)
- RLS is FORCED on all tables to ensure policies are always enforced
- Service role access is required for Prisma queries (server-side)
- Anonymous cart support is preserved via token-based read access

## Related Files

- Migration: `prisma/migrations/20250122000000_fix_rls_security_comprehensive/migration.sql`
- Previous RLS migration: `prisma/migrations/20250120000000_fix_rls_security/migration.sql` (if exists)
- Cart RLS fix: `prisma/migrations/20250116150000_fix_cart_rls/migration.sql`

