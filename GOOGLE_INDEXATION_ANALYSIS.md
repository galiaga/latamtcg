# Google Indexation Analysis Report
**Date:** February 8, 2026  
**Issue:** 12 pages showing "Crawled - currently not indexed" status in Google Search Console

## Executive Summary

Google Search Console reports **12 pages** that have been crawled but are not being indexed. Analysis of the CSV data and codebase reveals several potential issues that need to be addressed.

## Key Findings

### 1. Duplicate URL Variants (Critical Issue)
The CSV data shows Google is crawling multiple URL variants of the same pages:

- **HTTP vs HTTPS:** 
  - `http://latamtcg.com/` (should redirect to HTTPS)
  - `https://latamtcg.com/`
  
- **WWW vs Non-WWW:**
  - `http://www.latamtcg.com/` (should redirect)
  - `https://www.latamtcg.com/` (should redirect)
  - `https://latamtcg.com/`

**Impact:** Google may be treating these as separate pages, causing indexing confusion and potential duplicate content issues.

**Status:** Middleware redirects are in place, but Google may have cached old URLs before redirects were implemented.

### 2. Pages Missing from Sitemap
The following pages exist but are **NOT** included in the sitemap:

- `/cart` - Shopping cart page
- `/mtg` - MTG landing page (actually IS in sitemap - verified)
- `/mtg/printing/[printingId]` - Dynamic product pages (not in main sitemap)
- `/mtg/[oracleId]` - Card detail pages (not in main sitemap)
- `/mtg/card/[cardSlug]` - Alternative card routes (not in main sitemap)
- `/orders` - User orders page
- `/order/confirmation` - Order confirmation page
- `/auth` - Authentication page
- `/auth/callback` - Auth callback page

**Impact:** Pages not in the sitemap may be discovered by Google but not prioritized for indexing.

### 3. Missing Metadata on Key Pages
The `/cart` page is a client component (`'use client'`) and **lacks metadata export**:

```typescript
// src/app/cart/page.tsx - NO generateMetadata() function
'use client'
export default function CartPage() { ... }
```

**Impact:** Without proper metadata, Google may not understand the page's purpose or may choose not to index it.

### 4. Static Assets Being Crawled
The CSV shows Google is crawling static assets that shouldn't be indexed:

- `https://latamtcg.com/favicon.ico?v=3`
- `https://latamtcg.com/_next/static/media/...`

**Impact:** These consume crawl budget and may contribute to the "not indexed" count.

**Current Protection:** `robots.txt` allows all crawlers, but static files should be excluded from indexing via:
- Robots meta tags
- X-Robots-Tag headers
- Or robots.txt rules

### 5. Search Page Error Status
The CSV shows `/mtg/search` with **"Error" status** and last crawl date `2026-02-04`.

**Current Code Status:** The page has proper metadata with `index: true`, but there may be:
- Server-side rendering issues
- Content quality concerns
- Technical errors during crawl

## Recommendations

### Priority 1: Fix Duplicate URL Issues

1. **Verify Redirects Are Working:**
   ```bash
   # Test redirects
   curl -I http://latamtcg.com/
   curl -I https://www.latamtcg.com/
   ```

2. **Set Canonical URLs:** Ensure all pages have proper canonical URLs (most already do).

3. **Submit URL Removal Requests:** In Google Search Console, request removal of:
   - `http://latamtcg.com/`
   - `http://www.latamtcg.com/`
   - `https://www.latamtcg.com/`

### Priority 2: Add Missing Pages to Sitemap

1. **Add `/cart` page** (if it should be indexed - typically cart pages are `noindex`):
   ```typescript
   // If cart should NOT be indexed, add robots: { index: false }
   // If cart SHOULD be indexed, add to sitemap with low priority
   ```

2. **Consider Dynamic Sitemaps:** For product pages (`/mtg/printing/[printingId]`), consider:
   - Creating a separate sitemap for dynamic content
   - Or using a sitemap index file

### Priority 3: Add Metadata to Cart Page

If `/cart` should be indexed, add metadata:

```typescript
// src/app/cart/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carrito de Compras | LatamTCG',
  description: 'Revisa tu carrito de compras de cartas Magic: The Gathering',
  robots: { 
    index: false, // Typically cart pages should NOT be indexed
    follow: true 
  },
  alternates: {
    canonical: 'https://latamtcg.com/cart',
  },
}
```

**Note:** Cart pages are typically set to `noindex` since they're user-specific and not useful in search results.

### Priority 4: Block Static Assets from Indexing

Update `robots.txt` to disallow crawling of static assets:

```txt
# Block static assets
User-agent: *
Disallow: /_next/
Disallow: /favicon.ico
Disallow: /api/

# Allow all other pages
Allow: /

# Sitemap location
Sitemap: https://latamtcg.com/sitemap.xml
```

### Priority 5: Investigate Search Page Error

1. **Check Server Logs:** Look for errors on `/mtg/search` around `2026-02-04`.

2. **Test Page Rendering:**
   ```bash
   curl https://latamtcg.com/mtg/search
   ```

3. **Verify Metadata:** Ensure the page renders proper HTML with meta tags.

4. **Check for JavaScript Errors:** Client-side errors may prevent proper indexing.

### Priority 6: Monitor and Validate

1. **Request Re-indexing:** In Google Search Console, request indexing for:
   - Main pages that should be indexed
   - Pages after fixes are deployed

2. **Use URL Inspection Tool:** Test each of the 12 problematic URLs individually.

3. **Check Coverage Report:** Monitor the "Coverage" section in Search Console for updates.

## Immediate Action Items

1. ✅ **Verify redirects are working** (HTTP→HTTPS, www→non-www)
2. ✅ **Add `/cart` metadata** with `noindex` (cart pages shouldn't be indexed)
3. ✅ **Update `robots.txt`** to block static assets
4. ✅ **Request URL removals** for duplicate HTTP/www URLs in Search Console
5. ✅ **Test `/mtg/search` page** for errors
6. ✅ **Request re-indexing** after fixes are deployed

## Expected Outcome

After implementing these fixes:
- Duplicate URL issues should resolve within 1-2 weeks
- Static assets should stop being crawled
- Proper metadata will help Google understand page purpose
- The 12 "not indexed" pages should either be indexed or properly excluded

## Next Steps

1. Review this analysis
2. Prioritize fixes based on business impact
3. Implement fixes incrementally
4. Monitor Google Search Console for improvements
5. Re-analyze after 2-4 weeks
