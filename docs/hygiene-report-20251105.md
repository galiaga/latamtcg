# Hygiene Pass Report - 2025-11-05

## Executive Summary

This report documents findings from a deep hygiene sweep across the latamtcg codebase. All analysis was performed in read-only mode with no behavior changes. The report identifies unused code, duplicate logic, type safety issues, import hygiene problems, and bundle optimization opportunities.

**Analysis Date:** 2025-11-05  
**Branch:** `chore/hygiene-pass-20251105`  
**Total Files Analyzed:** 154 TypeScript/TSX files

---

## 1. Unused/Unreferenced Files

### High Confidence (95%+) - Safe to Delete

| File | Confidence | Detection Method | Reason |
|------|-----------|------------------|--------|
| `src/components/NewsletterForm.tsx` | 100% | knip, grep | No imports found, component not used in any page |
| `src/components/PricingDisplay.tsx` | 100% | knip, grep | No imports found, component not used |
| `src/lib/supabaseBrowser.ts` | 95% | grep, import analysis | Superseded by `src/lib/supabase-browser.ts` (different API) |
| `src/services/scryfallIngestDaily.new.ts` | 95% | knip, grep | `.new.ts` suffix suggests WIP/duplicate of `.ts` version |
| `src/services/fastPriceUpdate.ts` | 100% | knip, grep | No imports found |
| `src/services/simplePriceUpdate.ts` | 100% | knip, grep | No imports found |
| `src/services/ultraFastPriceUpdate.ts` | 100% | knip, grep | No imports found |
| `src/services/workingPriceUpdate.ts` | 100% | knip, grep | No imports found |
| `src/lib/purchaseLimit.ts` | 100% | knip, grep | No imports found in src/ (may be used in scripts) |
| `src/components/ui/SmartImage.tsx` | 100% | knip | No imports found |

### Medium Confidence (80-94%) - Archive Candidates

| File | Confidence | Detection Method | Reason |
|------|-----------|------------------|--------|
| `scripts/backfill-flavor-names.ts` | 85% | knip | No npm script references, may be manual utility |
| `scripts/bulk-update-all-prices.ts` | 85% | knip | No npm script references |
| `scripts/bust-cache.ts` | 85% | knip | No npm script references |
| `scripts/catch-up-missing-cards.ts` | 85% | knip | No npm script references |
| `scripts/fast-price-update.ts` | 85% | knip | No npm script references |
| `scripts/generate-36-processes.ts` | 85% | knip | No npm script references |
| `scripts/generate-prices-csv.ts` | 85% | knip | No npm script references |
| `scripts/ingest-scryfall-prices-optimized.ts` | 85% | knip | No npm script references (superseded by `-secure.ts`) |
| `scripts/ingest-scryfall-prices-production.ts` | 85% | knip | No npm script references (superseded by `-secure.ts`) |
| `scripts/ingest-scryfall-prices.ts` | 85% | knip | No npm script references (superseded by `-secure.ts`) |
| `scripts/rebuild-search-index.ts` | 85% | knip | No npm script references (may be manual utility) |
| `scripts/refresh-item-popularity.ts` | 85% | knip | No npm script references |
| `scripts/release.js` | 85% | knip | No npm script references |
| `scripts/run-scryfall-refresh.ts` | 85% | knip | No npm script references |
| `scripts/setup-kv-state.ts` | 85% | knip | No npm script references |
| `scripts/setup-price-ingestion.ts` | 85% | knip | No npm script references |
| `scripts/simple-price-update.ts` | 85% | knip | No npm script references |
| `scripts/test-original.ts` | 85% | knip | No npm script references |
| `scripts/test-rls-policies.js` | 85% | knip | No npm script references |
| `scripts/test-search-performance.ts` | 85% | knip | No npm script references |
| `scripts/ultra-fast-price-update.ts` | 85% | knip | No npm script references |
| `scripts/update-pricing-queries.ts` | 85% | knip | No npm script references |
| `scripts/vercel-ingest-stage.ts` | 85% | knip | Duplicate of `src/scripts/vercel-ingest-stage.ts` |
| `scripts/vercel-ingest-update.ts` | 85% | knip | Duplicate of `src/scripts/vercel-ingest-update.ts` |
| `scripts/vercel-ingest-upsert-history.ts` | 85% | knip | Duplicate of `src/scripts/vercel-ingest-upsert-history.ts` |
| `scripts/working-price-update.ts` | 85% | knip | No npm script references |
| `scripts/cron/run.ts` | 85% | knip | No npm script references |
| `scripts/load-test.js` | 80% | knip | Missing dependency `k6`, may be manual utility |
| `scripts/perf-prod.js` | 80% | knip | Used in npm script, but has lint errors |

### Public Assets

All public assets (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) appear to be Next.js defaults. No direct usage found, but they may be referenced by Next.js internals or used as favicons. **Low confidence - do not remove without verification.**

---

## 2. Dead Code Inside Used Files

### Unused Exports

From `ts-prune` analysis:

| File | Export | Status |
|------|--------|--------|
| `src/lib/cache.ts` | `cacheClear`, `createCacheAdapter` | Re-exported from `cache/index.ts` (legacy wrapper) |
| `src/lib/cardNames.ts` | `formatCardName` | Used internally in module only |
| `src/lib/pricingClient.ts` | `getBestPrice`, `computePriceCLPClient` | May be used in client components |
| `src/lib/pricingData.ts` | `getPriceForCard` | May be used in server components |
| `src/lib/printings.ts` | `findPrintingIdBySetCollector` | May be used in API routes |
| `src/lib/routes.ts` | `printingPrettyHref` | May be used in components |
| `src/lib/purchaseLimit.ts` | `evaluateUserItemLimit`, `evaluateAnonymousItemLimit`, `getPurchaseLimitInfo` | Not imported in src/ |
| `src/lib/supabaseBrowser.ts` | `getSupabaseBrowser` | Not imported (superseded by `supabase-browser.ts`) |
| `src/schemas/api.ts` | `SearchParams`, `SearchResponse`, `CartItem`, etc. | Type-only exports, may be used via type imports |
| `src/services/facetsOptimized.ts` | `buildFacets` | Used in API routes |
| `src/services/priceTrends.ts` | `fetchPriceHistory` | Used in API routes |
| `src/services/searchQueryGroupedSimple.ts` | `groupedSearchOptimized`, `groupedSearchOriginal` | Used in API routes |
| `src/components/pdp/PriceBlock.tsx` | `formatCLP` | Used internally in component |

### Unused Variables/Parameters (from ESLint)

High-priority cleanup candidates:

| File | Line | Variable | Severity |
|------|------|----------|----------|
| `scripts/generate-prices-csv.ts` | 17-18 | `pipeline`, `createGunzip` | Warning |
| `scripts/ingest-scryfall-prices-optimized.ts` | 381 | `result` | Warning |
| `scripts/ingest-scryfall-prices-production.ts` | 518 | `result` | Warning |
| `scripts/ingest-scryfall-prices-secure.ts` | 570, 777 | `isGzipped`, `result` | Warning |
| `scripts/ingest-scryfall-prices.ts` | 4, 307 | `Transform`, `result` | Warning |
| `scripts/scryfall-copy.ts` | 9 | `KV_KEY_NDJSON` | Warning |
| `scripts/update-pricing-queries.ts` | 17, 37 | `testQuery`, `error` | Warning |
| `scripts/vercel-ingest-stage-update.ts` | 115 | `firstLine` | Warning |
| `scripts/vercel-ingest-stage.ts` | 113 | `firstLine` | Warning |
| `scripts/vercel-ingest-update.ts` | 3 | `format` | Warning |
| `scripts/vercel-ingest-upsert-history.ts` | 3 | `format` | Warning |
| `scripts/vercel-retention-30d.ts` | 236 | `deletedRowsResult` | Warning |
| `src/app/api/cart/route.ts` | 8-9 | `CartApiResponse`, `CartResponseSchema` | Warning |
| `src/app/api/debug/env/route.ts` | 5 | `req` | Warning |
| `src/app/api/pricing/config/route.ts` | 4 | `request` | Warning |
| `src/app/api/pricing/preview/route.ts` | 4 | `computePriceCLP` | Warning |
| `src/app/api/search/route.ts` | 7, 18 | `SearchParamsSchema`, `SearchResponseSchema`, `rawParams` | Warning |
| `src/app/api/search/suggestions/route.ts` | 5 | `prisma` | Warning |
| `src/app/cart/page.tsx` | 8, 14 | `formatCLP`, `getDisplayPrice` | Warning |
| `src/app/layout.tsx` | 4, 6 | `ThemeToggle`, `pkg` | Warning |
| `src/app/mtg/printing/[printingId]/page.tsx` | 8 | `formatCLP` | Warning |
| `src/app/orders/page.tsx` | 1 | `Link` | Warning |

### Unused Imports

Many files have unused imports that can be safely removed. See ESLint output for complete list.

---

## 3. Duplicate Logic Candidates

### 1. Supabase Browser Client Creation

**Files:**
- `src/lib/supabase-browser.ts` (function: `supabaseBrowser()`)
- `src/lib/supabaseBrowser.ts` (function: `getSupabaseBrowser()`)

**Issue:** Two similar implementations of browser client creation with different APIs:
- `supabase-browser.ts`: Function returns client, no caching
- `supabaseBrowser.ts`: Function with singleton caching pattern

**Usage:**
- `supabase-browser.ts` is used in: `HeaderUser.tsx`, `cart/page.tsx`, `auth/callback/page.tsx`, `debug/auth/page.tsx`, `auth/page.tsx`
- `supabaseBrowser.ts` is **not imported anywhere**

**Recommendation:** Remove `supabaseBrowser.ts` (unused). Consider consolidating caching pattern into `supabase-browser.ts` if needed.

### 2. Scryfall Daily Ingest Duplicates

**Files:**
- `src/services/scryfallIngestDaily.ts`
- `src/services/scryfallIngestDaily.new.ts`

**Issue:** Near-duplicate files with `.new.ts` suffix suggesting WIP/experimental version.

**Analysis:** Both files have identical structure (254+ lines), same exports (`runDailyPriceUpdate`), similar imports. The `.new.ts` version uses aliased imports (`chain as streamChain` vs `chain`).

**Recommendation:** Archive `scryfallIngestDaily.new.ts` if the `.ts` version is the active one. Verify which is actually used.

### 3. FormatCLP Duplication

**Files:**
- `src/lib/format.ts`: `formatCLP(value: unknown | null): string`
- `src/components/pdp/PriceBlock.tsx`: `formatCLP(n?: number | null): string`

**Issue:** Two implementations of CLP formatting:
- `format.ts`: Uses `toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')` (thousands separator)
- `PriceBlock.tsx`: Uses `toLocaleString("es-CL")` (locale-aware)

**Recommendation:** Consolidate into `format.ts` and import in `PriceBlock.tsx`. Use locale-aware version for consistency.

### 4. Vercel Ingest Script Duplicates

**Files in `scripts/`:**
- `scripts/vercel-ingest-stage.ts`
- `scripts/vercel-ingest-update.ts`
- `scripts/vercel-ingest-upsert-history.ts`

**Files in `src/scripts/`:**
- `src/scripts/vercel-ingest-stage.ts`
- `src/scripts/vercel-ingest-update.ts`
- `src/scripts/vercel-ingest-upsert-history.ts`

**Issue:** Duplicate implementations in two locations. The `src/scripts/` versions are imported in `src/app/api/cron/ingest-all/route.ts`.

**Recommendation:** Remove `scripts/` versions if `src/scripts/` are the active ones.

### 5. Price Update Service Duplicates

**Files:**
- `src/services/fastPriceUpdate.ts`
- `src/services/simplePriceUpdate.ts`
- `src/services/ultraFastPriceUpdate.ts`
- `src/services/workingPriceUpdate.ts`

**Issue:** All four files export `run*PriceUpdate` functions but none are imported anywhere.

**Recommendation:** Archive or remove if superseded by `ingest-scryfall-prices-secure.ts`.

---

## 4. Type Hygiene

### Implicit `any` Types (from TypeScript)

**Test Files:**
- `src/services/__tests__/facetsOptimized.spec.ts`: 54 instances of implicit `any` in callback parameters
- `src/services/__tests__/priceTrends.spec.ts`: Missing vitest types (`describe`, `it`, `expect`)
- `src/services/__tests__/variantSuffix.integration.spec.ts`: Missing vitest types

**Fix:** Add explicit types to callback parameters, install `@types/vitest` or configure vitest globals.

### Explicit `any` Types (from ESLint)

**High Priority:**

| File | Line | Context | Recommendation |
|------|------|---------|----------------|
| `scripts/catch-up-missing-cards.ts` | 21 | Function parameter | Use `unknown` + type guard |
| `scripts/check-purchase-limits-migration.ts` | 47 | Function parameter | Use `unknown` + type guard |
| `scripts/db-sanitize-paper-only.ts` | 6, 28, 38 | Multiple | Use Prisma types |
| `scripts/generate-prices-csv.ts` | 82, 197 | Function parameters | Use typed interfaces |
| `scripts/ingest-scryfall-prices-production.ts` | 455 | Function parameter | Use typed interface |
| `scripts/ingest-scryfall-prices-secure.ts` | 234, 296, 487, 708 | Multiple | Use typed interfaces |
| `scripts/scryfall-copy.ts` | 61 | Function parameter | Use typed interface |
| `scripts/vercel-ingest-stage-update.ts` | 184 | Function parameter | Use typed interface |
| `scripts/vercel-ingest-stage.ts` | 182 | Function parameter | Use typed interface |
| `src/app/admin/pricing/page.tsx` | 16 | Function parameter | Use typed interface |
| `src/app/api/auth/callback/route.ts` | 7, 43 | Function parameters | Use Next.js types |
| `src/app/api/cart/reset/route.ts` | 17 | Function parameter | Use typed interface |
| `src/app/api/cron/ingest-all/route.ts` | 14 | Function parameter | Use typed interface |
| `src/app/api/db/health/route.ts` | 9 | Function parameter | Use typed interface |
| `src/app/api/mtg/printing/[printingId]/price-history/route.ts` | 63 | Function parameters (3x) | Use typed interfaces |
| `src/app/api/printing/resolve/route.ts` | 14 | Function parameter | Use typed interface |
| `src/app/auth/page.tsx` | 35 | OAuth options | Use Supabase types |
| `src/app/cart/page.tsx` | 31, 71, 117, 122, 182, 230 | Multiple | Use typed interfaces |
| `src/app/debug/auth/page.tsx` | 7 | Function parameter | Use typed interface |
| `src/app/mtg/printing/[printingId]/page.tsx` | 12, 26, 27, 40, 41, 88, 92 | Multiple | Use typed interfaces |
| `src/lib/supabase.ts` | 13, 29 | Cookie handling | Use Next.js cookie types |
| `src/lib/supabaseBrowser.ts` | 23 | Auth config | Remove `as any`, use proper types |

### Type Narrowing Opportunities

Several files use `value: unknown | null` but could narrow earlier:
- `src/lib/format.ts`: `formatUsd`, `formatCLP` - already good
- Various API routes: Request body parsing could use Zod schemas

---

## 5. Import Hygiene

### Wildcard Imports

**Found:**
- `src/app/mtg/printing/[printingId]/VariantSectionClient.tsx`: `import * as React from "react"` - acceptable for React

### Deep Imports (Potential Bundle Issues)

**Found:**
- `stream-json/streamers/StreamArray` - acceptable, no subpath exports available
- `@supabase/ssr` - acceptable, library design

### Circular Dependencies

**Analysis:** No circular dependencies detected in import graph analysis.

### Unused Imports

See Section 2 for complete list. Common patterns:
- Unused type imports
- Unused utility imports
- Unused component imports

---

## 6. Bundle/Size Hotspots

### Large Dependencies

From `package.json` analysis:
- `recharts`: Charting library (likely tree-shakeable)
- `@prisma/client`: Database client (generated, necessary)
- `stream-json`: Streaming JSON parser (used in ingestion scripts)

### Potential Optimizations

1. **Dynamic Imports for Admin Pages:**
   - `src/app/admin/pricing/page.tsx` - Admin-only, can be code-split

2. **Lazy Loading for Heavy Components:**
   - `PriceHistoryChart` (uses recharts) - Consider dynamic import
   - `OtherPrintingsCarousel` - Consider dynamic import

3. **Subpath Imports:**
   - All imports use default paths - no optimization needed

4. **Unused Exports in Public API:**
   - Many unused exports in `src/lib/*` - Tree-shaking should handle, but removing unused exports helps bundlers

---

## 7. Tool Outputs

### TypeScript Compiler (`tsc --noEmit`)

**Summary:** 69 errors found, all in test files:
- 54 implicit `any` in `facetsOptimized.spec.ts`
- 15 missing vitest type definitions

**Status:** Non-blocking for production (tests only), but should be fixed for type safety.

### ESLint

**Summary:** 
- 85 errors (mostly `any` types, unescaped entities in JSX)
- 30 warnings (unused variables, unused imports)

**Categories:**
- `@typescript-eslint/no-explicit-any`: 40 errors
- `react/no-unescaped-entities`: 20 errors
- `@typescript-eslint/no-unused-vars`: 30 warnings
- `@typescript-eslint/no-require-imports`: 4 errors (in `.js` files)

### Knip

**Summary:** Found 40 unused files:
- 10 high-confidence unused files in `src/`
- 30 medium-confidence unused files in `scripts/`

**Unused Dependencies:**
- `pg-copy-streams` (in package.json, not imported)

**Unused DevDependencies:**
- `@testing-library/jest-dom` (not used with vitest)
- `@testing-library/user-event` (not used)
- `ts-node` (not used, project uses `tsx`)

**Missing Dependencies:**
- `stream-chain` (used in `scryfallIngestDaily.new.ts`, not in package.json)
- `k6` (used in `load-test.js`, not in package.json - likely external tool)

### ts-prune

**Summary:** Found 100+ unused exports, but many are:
- Type-only exports (used via type imports)
- Server/Client boundary exports (used in different contexts)
- Internal module exports (used within file)

**True Unused Exports:**
- `src/lib/supabaseBrowser.ts`: `getSupabaseBrowser` (superseded)
- `src/lib/purchaseLimit.ts`: All exports (not imported)
- `src/services/*PriceUpdate.ts`: All exports (not imported)

### depcheck

**Summary:**
- Unused: `pg-copy-streams`
- Missing: `stream-chain` (for `.new.ts` file)
- Note: `k6` is external tool, not npm dependency

---

## 8. Needs Product Review

The following items require product/team decision before cleanup:

1. **Scripts Folder Organization:**
   - Many scripts in `scripts/` have no npm script references
   - May be manual utilities or run via cron/jobs
   - **Decision needed:** Archive unused scripts or document usage?

2. **Duplicate Ingest Implementations:**
   - Multiple price update services (`fast`, `simple`, `ultra`, `working`)
   - Which is the canonical implementation?
   - **Decision needed:** Which files are active vs legacy?

3. **Test Type Definitions:**
   - Vitest globals not recognized by TypeScript
   - **Decision needed:** Add `@types/vitest` or configure vitest globals in tsconfig?

4. **Public Assets:**
   - Next.js default SVGs in `public/`
   - **Decision needed:** Are these used as favicons or can be removed?

---

## Appendix A: ESLint Full Output

```bash
# Run: npm run lint
# Summary: 85 errors, 30 warnings
# See full output in Phase 1 analysis above
```

## Appendix B: TypeScript Errors

```typescript
// 69 errors in test files only
// All related to implicit any or missing vitest types
// See Section 4 for details
```

## Appendix C: Knip JSON Output

```json
{
  "files": ["40 unused files identified"],
  "issues": {
    "unusedExports": ["100+ exports"],
    "unusedDependencies": ["pg-copy-streams"],
    "missingDependencies": ["stream-chain"]
  }
}
```

## Appendix D: Import Graph Sample

```
src/app/layout.tsx
  ├─> src/components/ThemeToggle.tsx
  ├─> src/components/SearchBox.tsx
  ├─> src/components/SafeClient.tsx
  ├─> src/components/HeaderUser.tsx
  │    └─> src/lib/supabase-browser.ts ✓
  ├─> src/components/HeaderCart.tsx
  ├─> src/components/CartProvider.tsx
  ├─> src/components/PricingProvider.tsx
  └─> src/components/Footer.tsx

Unused imports detected:
  - ThemeToggle (imported but not used in layout.tsx)
  - pkg (imported but not used)
```

---

## Next Steps (Phase 2)

Based on this analysis, Phase 2 will:

1. **Remove unused files** (95%+ confidence)
2. **Archive medium-confidence files** to `internal/_archive/20251105/`
3. **Remove unused imports/variables** (ESLint warnings)
4. **Consolidate duplicate logic** (supabase clients, formatCLP)
5. **Fix type issues** (replace `any` with proper types where safe)
6. **Update test type definitions** (vitest globals)
7. **Remove unused dependencies** (`pg-copy-streams`, test libraries if unused)

All changes will be behavior-preserving and verified with:
- `tsc --noEmit`
- `npm run lint`
- `npm run build`
- Smoke tests on critical routes

