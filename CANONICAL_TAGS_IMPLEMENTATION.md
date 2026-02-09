# Canonical Tags Implementation Summary

**Date:** February 8, 2026  
**Goal:** Add proper canonical tags to all indexable pages so Google sees a single canonical URL per page.

## ✅ Implementation Complete

All indexable pages now have proper canonical tags using Next.js 16 App Router metadata API.

## Files Modified

### 1. `/src/app/mtg/page.tsx`
**Route:** `/mtg`  
**Status:** ✅ Added metadata with canonical

**Canonical URL:** `https://latamtcg.com/mtg`

**Implementation:**
- Added `generateMetadata` export (static metadata object)
- Canonical URL is static and does not include query parameters
- Includes proper robots directives (`index: true, follow: true`)

---

### 2. `/src/app/mtg/[oracleId]/page.tsx`
**Route:** `/mtg/[oracleId]` (dynamic)  
**Status:** ✅ Added `generateMetadata` function with canonical

**Canonical URL:** `https://latamtcg.com/mtg/{oracleId}`

**Implementation:**
- Added `generateMetadata` async function that receives `params`
- Extracts `oracleId` from route parameters
- Fetches card name from database for better metadata
- Builds canonical URL using the `oracleId` parameter: `https://latamtcg.com/mtg/${oracleId}`
- Canonical URL is stable and does not include query parameters
- Includes proper robots directives

**Example:**
- Route: `/mtg/abc123-def456`
- Canonical: `https://latamtcg.com/mtg/abc123-def456`

---

### 3. `/src/app/mtg/card/[cardSlug]/page.tsx`
**Route:** `/mtg/card/[cardSlug]` (dynamic)  
**Status:** ✅ Enhanced existing metadata with canonical

**Canonical URL:** `https://latamtcg.com/mtg/card/{cardSlug}`

**Implementation:**
- Enhanced existing `generateMetadata` function
- Extracts `cardSlug` from route parameters
- Builds canonical URL using the `cardSlug` parameter: `https://latamtcg.com/mtg/card/${cardSlug}`
- Canonical URL is stable and does not include query parameters
- Added proper robots directives and OpenGraph metadata

**Example:**
- Route: `/mtg/card/lightning-bolt`
- Canonical: `https://latamtcg.com/mtg/card/lightning-bolt`

---

## Pages Already Configured (No Changes Needed)

### ✅ `/src/app/page.tsx`
**Route:** `/`  
**Status:** Already has canonical

**Canonical URL:** `https://latamtcg.com`

**Note:** Already properly configured with canonical in `generateMetadata` function.

---

### ✅ `/src/app/mtg/search/page.tsx`
**Route:** `/mtg/search`  
**Status:** Already has canonical (correctly handles query params)

**Canonical URL:** `https://latamtcg.com/mtg/search`

**Note:** 
- Uses static canonical URL regardless of search query parameters
- This is correct behavior - search pages should have a single canonical URL even when accessed with different query parameters
- Example: `/mtg/search?q=lightning&page=2` still has canonical `https://latamtcg.com/mtg/search`

---

### ✅ `/src/app/mtg/printing/[printingId]/page.tsx`
**Route:** `/mtg/printing/[printingId]` (dynamic)  
**Status:** Already has canonical

**Canonical URL:** `https://latamtcg.com/mtg/printing/{printingId}`

**Note:** Already properly configured with canonical in `generateMetadata` function.

---

## Canonical Tag Requirements Met

✅ **Base Domain:** All canonical URLs use `https://latamtcg.com`  
✅ **No Query Parameters:** Canonical URLs never include query parameters, even for pages that accept them  
✅ **Clean Route Path:** Canonical URLs reflect the clean route path structure  
✅ **Stable URLs:** Canonical URLs remain consistent regardless of how the page is accessed  
✅ **Dynamic Routes:** Dynamic route parameters are properly included in canonical URLs

## How Canonical is Generated for Each Route

### Static Routes (`/mtg`)
```typescript
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://latamtcg.com/mtg',
  },
}
```
- **Method:** Static metadata object
- **Canonical:** Hardcoded static URL
- **Query Params:** Not applicable (static route)

---

### Dynamic Routes (`/mtg/[oracleId]`)
```typescript
export async function generateMetadata(props: { params: Promise<{ oracleId: string }> }): Promise<Metadata> {
  const { oracleId } = await props.params
  const canonical = `https://latamtcg.com/mtg/${oracleId}`
  return {
    alternates: { canonical },
  }
}
```
- **Method:** Async `generateMetadata` function
- **Canonical:** Built from route parameter (`oracleId`)
- **Query Params:** Not included in canonical (route params only)

---

### Dynamic Routes (`/mtg/card/[cardSlug]`)
```typescript
export async function generateMetadata(props: { params: Promise<{ cardSlug: string }> }): Promise<Metadata> {
  const { cardSlug } = await props.params
  const canonical = `https://latamtcg.com/mtg/card/${cardSlug}`
  return {
    alternates: { canonical },
  }
}
```
- **Method:** Async `generateMetadata` function
- **Canonical:** Built from route parameter (`cardSlug`)
- **Query Params:** Not included in canonical (route params only)

---

### Pages with Query Parameters (`/mtg/search`)
```typescript
export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: {
      canonical: 'https://latamtcg.com/mtg/search', // Static, ignores searchParams
    },
  }
}
```
- **Method:** Async `generateMetadata` function (does not receive `searchParams`)
- **Canonical:** Static URL that ignores query parameters
- **Query Params:** Intentionally excluded from canonical

**Note:** The `generateMetadata` function for `/mtg/search` does not receive `searchParams` as a parameter, which means it always returns the same canonical URL regardless of query parameters. This is the correct behavior for search pages.

---

## Testing Recommendations

1. **Verify Canonical Tags in HTML:**
   ```bash
   curl https://latamtcg.com/mtg | grep -i canonical
   curl https://latamtcg.com/mtg/abc123 | grep -i canonical
   curl https://latamtcg.com/mtg/card/lightning-bolt | grep -i canonical
   ```

2. **Check Google Search Console:**
   - Use URL Inspection Tool to verify canonical tags are detected
   - Monitor Coverage report for canonical issues

3. **Verify Query Parameter Handling:**
   ```bash
   # These should all have the same canonical
   curl "https://latamtcg.com/mtg/search?q=test" | grep -i canonical
   curl "https://latamtcg.com/mtg/search?q=test&page=2" | grep -i canonical
   ```

## Next Steps

1. ✅ Deploy changes to production
2. ✅ Verify canonical tags appear in HTML source
3. ✅ Request re-indexing in Google Search Console for updated pages
4. ✅ Monitor Google Search Console for canonical tag recognition
