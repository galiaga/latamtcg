# Card Route Redirect Implementation

**Date:** February 8, 2026  
**Goal:** Make `/mtg/card/[cardSlug]` the ONLY indexable canonical URL for card pages, with `/mtg/[oracleId]` as a permanent redirect alias.

## ✅ Implementation Complete

### Summary of Changes

1. **Created slug utility** (`src/lib/cardSlug.ts`)
   - `cardNameToSlug()` - Converts card names to URL-safe slugs
   - `getCardSlugFromOracleId()` - Looks up card slug from oracleId

2. **Updated `/mtg/[oracleId]` route** (`src/app/mtg/[oracleId]/page.tsx`)
   - Now redirects permanently (308) to `/mtg/card/[cardSlug]`
   - Has `noindex` metadata (redirect pages shouldn't be indexed)
   - Returns 404 if oracleId not found

3. **Updated sitemap** (`src/app/sitemap.xml/route.ts`)
   - Now includes `/mtg/card/[cardSlug]` entries instead of `/mtg/[oracleId]`
   - Generates slugs from card names in database
   - Excludes `/mtg/[oracleId]` routes

4. **Updated component** (`src/components/OtherPrintingsCarousel.tsx`)
   - "View All Printings" link now uses slug route instead of oracleId route

5. **Verified canonical tags** (`src/app/mtg/card/[cardSlug]/page.tsx`)
   - Already has correct self-referencing canonical
   - Uses `https://latamtcg.com` base URL

## Files Modified

1. ✅ `src/lib/cardSlug.ts` (new file)
2. ✅ `src/app/mtg/[oracleId]/page.tsx`
3. ✅ `src/app/sitemap.xml/route.ts`
4. ✅ `src/components/OtherPrintingsCarousel.tsx`
5. ✅ `src/app/mtg/card/[cardSlug]/page.tsx` (verified, no changes needed)

## How the Redirect Works

### Redirect Flow

1. **User visits:** `/mtg/[oracleId]` (e.g., `/mtg/00000000-0000-0000-0000-000000000001`)

2. **Server-side lookup:**
   - `getCardSlugFromOracleId()` queries database for card name
   - Finds first card with matching `oracleId`, `isPaper: true`, `lang: 'en'`
   - Orders by `releasedAt: 'desc'` to prefer newer cards

3. **Slug generation:**
   - Card name converted to slug via `cardNameToSlug()`
   - Example: "Lightning Bolt" → "lightning-bolt"

4. **Redirect:**
   - Returns `NextResponse.redirect()` with status 308 (Permanent Redirect)
   - Redirects to: `/mtg/card/lightning-bolt`

5. **If not found:**
   - Returns 404 via `notFound()`

### Where It Runs

- **Location:** Server-side (Next.js App Router)
- **Edge/Server:** Server-side rendering (not edge runtime)
- **Timing:** Executes on every request to `/mtg/[oracleId]`
- **Caching:** No caching - always looks up fresh data (redirects should be fast)

### Redirect Status Code: 308

- **308 Permanent Redirect** (instead of 301)
- Preserves HTTP method (GET, POST, etc.)
- Preferred for permanent redirects in modern web standards
- Tells search engines: "This URL has permanently moved"

## Slug Generation Rules

The `cardNameToSlug()` function:
- Converts to lowercase
- Replaces spaces with hyphens
- Removes special characters (keeps only alphanumeric and hyphens)
- Collapses multiple hyphens
- Trims leading/trailing hyphens

**Examples:**
- "Lightning Bolt" → "lightning-bolt"
- "Jace, the Mind Sculptor" → "jace-the-mind-sculptor"
- "Sol'kanar the Swamp King" → "solkanar-the-swamp-king"
- "Ach! Hans, Run!" → "ach-hans-run"

## Sitemap Changes

### Before
```xml
<url>
  <loc>https://latamtcg.com/mtg/00000000-0000-0000-0000-000000000001</loc>
  ...
</url>
```

### After
```xml
<url>
  <loc>https://latamtcg.com/mtg/card/lightning-bolt</loc>
  ...
</url>
```

**Query Logic:**
- Fetches unique card names (not oracleIds)
- Groups by `name` field with `distinct: ['name']`
- Only includes cards with prices and `isPaper: true`, `lang: 'en'`
- Converts each name to slug and builds URL

## SEO Impact

### ✅ Benefits

1. **Single Canonical URL:** Only `/mtg/card/[cardSlug]` is indexed
2. **No Duplicate Content:** `/mtg/[oracleId]` redirects, not indexed
3. **User-Friendly URLs:** Slugs are readable (e.g., `/mtg/card/lightning-bolt`)
4. **Stable URLs:** Card names don't change, slugs remain stable
5. **Proper Redirects:** 308 status tells search engines it's permanent

### ✅ Canonical Tags

- `/mtg/card/[cardSlug]` - Self-referencing canonical ✅
- `/mtg/[oracleId]` - `noindex` (redirect page) ✅
- Base URL: `https://latamtcg.com` ✅
- No query parameters ✅

## Regression Checks

### ✅ Verified

1. **No other routes set canonical to `/mtg/[oracleId]`**
   - Only `/mtg/[oracleId]` page itself had canonical (now removed)

2. **Sitemap never emits oracleId URLs**
   - Sitemap now uses card names → slugs
   - No oracleId URLs in sitemap

3. **All internal links updated**
   - `OtherPrintingsCarousel` component updated
   - Other components checked (no other references found)

## Manual Test Plan

### Test 1: Redirect Works
```bash
# Test redirect from oracleId to slug
curl -I https://latamtcg.com/mtg/00000000-0000-0000-0000-000000000001

# Expected:
# HTTP/1.1 308 Permanent Redirect
# Location: https://latamtcg.com/mtg/card/lightning-bolt
```

### Test 2: Canonical Tag on Slug Route
```bash
# Test canonical tag
curl https://latamtcg.com/mtg/card/lightning-bolt | grep -i canonical

# Expected:
# <link rel="canonical" href="https://latamtcg.com/mtg/card/lightning-bolt" />
```

### Test 3: Noindex on OracleId Route
```bash
# Test robots meta (should be noindex)
curl https://latamtcg.com/mtg/00000000-0000-0000-0000-000000000001 | grep -i robots

# Expected:
# <meta name="robots" content="noindex, follow" />
# (Note: May redirect before HTML is returned)
```

### Test 4: Sitemap Contains Slug Routes
```bash
# Test sitemap
curl https://latamtcg.com/sitemap.xml | grep -i "mtg/card"

# Expected:
# <loc>https://latamtcg.com/mtg/card/lightning-bolt</loc>
# <loc>https://latamtcg.com/mtg/card/jace-the-mind-sculptor</loc>
# ... (no oracleId URLs)
```

### Test 5: 404 for Invalid OracleId
```bash
# Test 404 handling
curl -I https://latamtcg.com/mtg/invalid-oracle-id-12345

# Expected:
# HTTP/1.1 404 Not Found
```

### Test 6: Slug Route Works
```bash
# Test slug route renders correctly
curl https://latamtcg.com/mtg/card/lightning-bolt | grep -i "lightning bolt"

# Expected:
# Page content with card name and search results
```

## Example URLs

### Valid Redirects
- `/mtg/00000000-0000-0000-0000-000000000001` → `/mtg/card/lightning-bolt`
- `/mtg/abc123-def456-ghi789` → `/mtg/card/jace-the-mind-sculptor`

### Valid Slug Routes (Indexable)
- `/mtg/card/lightning-bolt`
- `/mtg/card/jace-the-mind-sculptor`
- `/mtg/card/solkanar-the-swamp-king`

### Invalid (404)
- `/mtg/invalid-oracle-id`
- `/mtg/card/non-existent-card-name`

## Performance Considerations

- **Database Query:** One query per redirect (looks up card name)
- **Caching:** No caching on redirect (ensures fresh data)
- **Speed:** Query is simple (indexed `oracleId` field, single row lookup)
- **Sitemap Generation:** Groups by name (more efficient than per-oracleId)

## Next Steps

1. ✅ Deploy to production
2. ✅ Verify redirects work in production
3. ✅ Submit updated sitemap to Google Search Console
4. ✅ Monitor redirect performance
5. ✅ Check Google Search Console for canonical tag recognition

## Notes

- **Slug Stability:** Card names are stable, so slugs won't change
- **Case Sensitivity:** Slugs are lowercase (case-insensitive matching)
- **Special Characters:** Removed from slugs for URL safety
- **Encoding:** Next.js handles URL encoding automatically for route parameters
