# Sitemap Implementation Summary

**Date:** February 8, 2026  
**Goal:** Create/fix sitemap to only include SEO-relevant, indexable pages

## ✅ Implementation Complete

The sitemap has been updated to include only SEO-relevant, indexable pages. Dynamic card routes are now fetched from the database and included in the sitemap.

## File Modified

**`src/app/sitemap.xml/route.ts`**
- Completely rewritten to fetch dynamic routes from database
- Removed non-indexable pages
- Added error handling with fallback to static pages only

## Sitemap Structure

### Static Pages Included

| Route | Priority | Change Frequency | URL |
|-------|----------|------------------|-----|
| Homepage | 1.0 | daily | `https://latamtcg.com/` |
| MTG Landing | 0.9 | daily | `https://latamtcg.com/mtg` |

### Dynamic Pages Included

| Route Pattern | Priority | Change Frequency | Count |
|--------------|----------|------------------|-------|
| `/mtg/[oracleId]` | 0.7 | weekly | All unique cards with prices |

**Dynamic Route Generation:**
- Fetches unique `oracleId` values from database
- Only includes cards that:
  - Are paper cards (`isPaper: true`)
  - Are in English (`lang: 'en'`)
  - Have a non-empty `oracleId`
  - Have at least one price (USD, USD Foil, or USD Etched)
- Ordered alphabetically by `oracleId`
- Each card gets a URL: `https://latamtcg.com/mtg/{oracleId}`

**Example Dynamic URLs:**
```
https://latamtcg.com/mtg/00000000-0000-0000-0000-000000000001
https://latamtcg.com/mtg/00000000-0000-0000-0000-000000000002
...
```

## Pages Excluded (Correctly)

### ❌ User-Specific Pages (have `noindex`)
- `/cart` - Shopping cart (user-specific, noindex)
- `/orders` - User orders (user-specific, noindex)
- `/auth` - Authentication (user-specific, noindex)

### ❌ Search Pages (should not be indexed)
- `/mtg/search` - Search page with query parameters (excluded from sitemap)
- `/search/advanced` - Advanced search (excluded from sitemap)

### ❌ Other Non-Indexable Pages
- `/mass-entry` - Bulk entry tool (excluded)
- Any URL with query parameters (automatically excluded)

### ❌ Previously Included (Now Removed)
The following pages were in the old sitemap but are now **correctly excluded**:
- `/mtg/search` ❌ (search pages shouldn't be in sitemap)
- `/mtg/sets` ❌ (not explicitly requested, can be added if needed)
- `/search/advanced` ❌ (search page)
- `/about` ❌ (not in requirements)
- `/en/*` ❌ (English routes - not in requirements)
- `/how-it-works` ❌ (not in requirements)
- `/help` ❌ (not in requirements)
- `/contact` ❌ (not in requirements)
- `/returns` ❌ (not in requirements)
- `/terms` ❌ (not in requirements)
- `/privacy` ❌ (not in requirements)
- `/mass-entry` ❌ (not in requirements)

## Technical Implementation

### Database Query

```typescript
const uniqueOracleIds = await prisma.mtgCard.findMany({
  where: {
    isPaper: true,
    lang: 'en',
    oracleId: { not: '' },
    OR: [
      { priceUsd: { not: null } },
      { priceUsdFoil: { not: null } },
      { priceUsdEtched: { not: null } },
    ],
  },
  select: {
    oracleId: true,
  },
  distinct: ['oracleId'],
  orderBy: {
    oracleId: 'asc',
  },
})
```

**Why these filters?**
- `isPaper: true` - Only physical cards (not digital)
- `lang: 'en'` - Only English cards (matches site language)
- `oracleId: { not: '' }` - Exclude cards without oracle IDs
- `OR` price conditions - Only include cards with at least one price
- `distinct: ['oracleId']` - Get unique cards (one entry per card, not per printing)

### Error Handling

The sitemap includes error handling:
- If database query fails, returns static pages only
- Still returns HTTP 200 to avoid breaking sitemap submission
- Logs errors for debugging

### Caching

```typescript
headers: {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
}
```

- **s-maxage=3600**: Cache for 1 hour (reduces database load)
- **stale-while-revalidate=86400**: Serve stale content for up to 24 hours while revalidating

## Sitemap Access

- **URL:** `https://latamtcg.com/sitemap.xml`
- **Referenced in:** `public/robots.txt`
- **Format:** XML (sitemap.org v0.9)

## Expected Sitemap Size

The sitemap will contain:
- **2 static pages** (homepage + MTG landing)
- **N dynamic card pages** (where N = number of unique cards with prices)

**Example:** If there are 10,000 unique cards with prices, the sitemap will have 10,002 URLs.

### Sitemap Limits

- **Maximum URLs per sitemap:** 50,000 (sitemap.org standard)
- **Maximum file size:** 50MB uncompressed (sitemap.org standard)

**If limits are exceeded:**
- Consider implementing sitemap index with multiple sitemap files
- Split card pages into multiple sitemaps (e.g., `sitemap-cards-1.xml`, `sitemap-cards-2.xml`)

## Validation

The sitemap can be validated using:
1. **Google Search Console** - Submit sitemap URL
2. **XML Validator** - Validate XML structure
3. **SEO Tools** - Check sitemap coverage

## Next Steps

1. ✅ Deploy changes to production
2. ✅ Verify sitemap is accessible at `https://latamtcg.com/sitemap.xml`
3. ✅ Submit sitemap to Google Search Console
4. ✅ Monitor sitemap coverage in Search Console
5. ⚠️ **If sitemap exceeds 50,000 URLs:** Implement sitemap index with multiple files

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Static Pages Included | 2 | ✅ |
| Dynamic Card Pages | N (from DB) | ✅ |
| Pages Excluded | All non-indexable | ✅ |
| Query Parameters | 0 | ✅ (none included) |
| Base URL | `https://latamtcg.com` | ✅ |
| Error Handling | Yes | ✅ |
| Caching | Yes (1 hour) | ✅ |

The sitemap now correctly includes only SEO-relevant, indexable pages as requested.
