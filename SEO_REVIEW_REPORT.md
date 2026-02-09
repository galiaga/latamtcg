# SEO Implementation Review Report

**Date:** February 8, 2026  
**Review Scope:** Canonical tags and sitemap implementation

## ✅ Checklist Results

### 1. Canonical URLs Always Point to https://latamtcg.com

**Status:** ✅ **PASS** with minor inconsistency noted

**Findings:**
- All canonical URLs correctly use `https://latamtcg.com` as base domain
- **Inconsistency Found:** Some routes use hardcoded `'https://latamtcg.com'`, others use environment variable fallback:
  - Hardcoded: `/mtg`, `/mtg/[oracleId]`, `/mtg/card/[cardSlug]`, `/mtg/search`
  - Environment variable: `/mtg/printing/[printingId]` uses `process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://latamtcg.com'`

**Recommendation:** Standardize to hardcoded `'https://latamtcg.com'` for consistency, or ensure environment variables are always set correctly in production.

---

### 2. No Canonical Contains Query Parameters

**Status:** ✅ **PASS**

**Findings:**
- All canonical URLs are clean paths without query parameters
- `/mtg/search` correctly uses static canonical `https://latamtcg.com/mtg/search` regardless of query params
- Dynamic routes (`/mtg/[oracleId]`, `/mtg/card/[cardSlug]`, `/mtg/printing/[printingId]`) only use route parameters, no query strings

**No issues found.**

---

### 3. No Non-Indexable Routes in Sitemap

**Status:** ✅ **PASS** with clarification needed

**Findings:**
- ✅ `/cart` - Correctly excluded (has `noindex`)
- ✅ `/orders` - Correctly excluded (has `noindex`)
- ✅ `/auth` - Correctly excluded (has `noindex`)
- ✅ `/mtg/search` - Correctly excluded (per requirements)
- ✅ Query parameters - Correctly excluded (no URLs with query params)

**Clarification Needed:**
- `/mtg/printing/[printingId]` - **NOT in sitemap** but has `index: true` robots tag
  - This appears intentional (individual printings vs. card groups)
  - **Recommendation:** Verify if printing pages should be in sitemap or if current exclusion is correct

---

### 4. Dynamic Routes Generate Stable, Deterministic URLs

**Status:** ✅ **PASS** with edge case considerations

**Findings:**
- `/mtg/[oracleId]` - Uses `oracleId` directly (UUID format, URL-safe)
- `/mtg/card/[cardSlug]` - Uses `cardSlug` directly (URL-encoded slug format)
- `/mtg/printing/[printingId]` - Uses `printingId` directly (UUID format, URL-safe)

**Edge Cases Identified:**

1. **URL Encoding for oracleId:**
   - Oracle IDs are Scryfall UUIDs (format: `00000000-0000-0000-0000-000000000001`)
   - UUIDs are URL-safe and don't require encoding
   - ✅ **No action needed** - UUIDs are safe for URLs

2. **URL Encoding for cardSlug:**
   - Card slugs use `decodeURIComponent` in page logic, suggesting they may be encoded
   - Canonical uses raw `cardSlug` parameter
   - Next.js automatically handles URL encoding/decoding for route parameters
   - ✅ **No action needed** - Next.js handles encoding correctly

3. **Potential Duplicate Content Issue:**
   - `/mtg/[oracleId]` - Shows all printings of a card (grouped by oracleId)
   - `/mtg/card/[cardSlug]` - Shows all printings of a card (grouped by name)
   - Both routes exist and both have canonical tags
   - **Issue:** `/mtg/card/[cardSlug]` is **NOT in sitemap**, but `/mtg/[oracleId]` is
   - **Risk:** If both routes show the same content for the same card, Google might see duplicate content
   - **Recommendation:** 
     - Option A: Add `/mtg/card/[cardSlug]` to sitemap if it's meant to be indexed
     - Option B: Add canonical from `/mtg/card/[cardSlug]` pointing to `/mtg/[oracleId]` if they're duplicates
     - Option C: Verify if `/mtg/card/[cardSlug]` should have `noindex` if it's redundant

---

## ⚠️ Potential SEO Issues & Edge Cases

### Issue 1: Route Duplication - `/mtg/[oracleId]` vs `/mtg/card/[cardSlug]`

**Severity:** Medium

**Description:**
- Two routes exist for viewing card printings:
  - `/mtg/[oracleId]` - Uses Scryfall oracle ID (UUID)
  - `/mtg/card/[cardSlug]` - Uses card name slug (e.g., `lightning-bolt`)
- Both routes have canonical tags pointing to themselves
- Only `/mtg/[oracleId]` is in the sitemap
- If both routes show the same content, this could cause duplicate content issues

**Recommendation:**
1. **Verify content similarity:** Check if both routes show identical content for the same card
2. **If duplicates:** Add canonical from `/mtg/card/[cardSlug]` pointing to `/mtg/[oracleId]`
3. **If different:** Add `/mtg/card/[cardSlug]` to sitemap if it should be indexed

**Code Location:**
- `/src/app/mtg/[oracleId]/page.tsx`
- `/src/app/mtg/card/[cardSlug]/page.tsx`

---

### Issue 2: Printing Pages Not in Sitemap

**Severity:** Low

**Description:**
- `/mtg/printing/[printingId]` pages have `index: true` robots tag
- These pages are **NOT** included in the sitemap
- This is likely intentional (individual printings vs. card groups), but should be verified

**Recommendation:**
- **If intentional:** Document that printing pages are discoverable via internal links, not sitemap
- **If should be indexed:** Consider adding printing pages to sitemap (may require sitemap index if count is high)

**Code Location:**
- `/src/app/mtg/printing/[printingId]/page.tsx`
- `/src/app/sitemap.xml/route.ts`

---

### Issue 3: Base URL Inconsistency

**Severity:** Low

**Description:**
- Most routes use hardcoded `'https://latamtcg.com'`
- `/mtg/printing/[printingId]` uses `process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://latamtcg.com'`
- Inconsistency could cause issues if environment variables are misconfigured

**Recommendation:**
- Standardize all canonical URLs to use hardcoded `'https://latamtcg.com'` for consistency
- Or ensure environment variables are always set correctly in all environments

**Affected Files:**
- `/src/app/mtg/printing/[printingId]/page.tsx` (uses env vars)
- All other routes (use hardcoded)

---

### Issue 4: Search Page Indexing Status

**Severity:** Low (Informational)

**Description:**
- `/mtg/search` has `index: true` robots tag
- `/mtg/search` is correctly excluded from sitemap (per requirements)
- This is correct behavior - search pages can be indexed but don't need to be in sitemap

**Status:** ✅ **No action needed** - This is correct per requirements

---

## ✅ Strengths

1. **Clean Canonical URLs:** All canonical URLs are clean paths without query parameters
2. **Proper Exclusion:** Non-indexable pages correctly excluded from sitemap
3. **Stable Dynamic Routes:** Dynamic routes generate deterministic, stable URLs
4. **Error Handling:** Sitemap has proper error handling with fallback
5. **Caching:** Sitemap has appropriate caching headers

---

## 📋 Action Items

### High Priority
1. ⚠️ **Verify route duplication:** Check if `/mtg/[oracleId]` and `/mtg/card/[cardSlug]` show duplicate content
   - If duplicates: Add canonical from cardSlug route to oracleId route
   - If different: Add cardSlug route to sitemap if it should be indexed

### Medium Priority
2. ⚠️ **Standardize base URL:** Use consistent base URL approach across all routes
   - Either hardcode `'https://latamtcg.com'` everywhere, or use env vars consistently

### Low Priority
3. 📝 **Document printing pages:** Clarify if printing pages should be in sitemap or discoverable via internal links only
4. 📝 **Monitor sitemap size:** If card count exceeds 50,000, implement sitemap index

---

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| Canonical URLs point to https://latamtcg.com | ✅ PASS | Minor inconsistency in base URL source |
| No query parameters in canonical | ✅ PASS | All clean |
| No non-indexable routes in sitemap | ✅ PASS | Correctly excluded |
| Stable, deterministic dynamic URLs | ✅ PASS | UUIDs and slugs are URL-safe |

**Overall Assessment:** ✅ **Implementation is solid** with minor improvements recommended for route duplication and base URL consistency.
