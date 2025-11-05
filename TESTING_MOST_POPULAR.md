# Testing Guide: Most Popular Sort Feature

This guide helps you verify that the "Most Popular" sorting option works correctly.

## Prerequisites

1. **Environment Variables Set**:
   ```bash
   MOST_POPULAR_ENABLED=true
   MOST_POPULAR_WINDOW_DAYS=30
   ```

2. **Database Migration Applied**:
   - Materialized view `item_popularity_mv` should exist
   - Run: `npm run db:migrate:popularity` if not already applied

3. **Materialized View Populated**:
   - Should have at least some rows (check with SQL query below)

## Step 1: Verify Database Setup

### Check if Materialized View Exists

```sql
SELECT COUNT(*) as row_count
FROM pg_matviews
WHERE schemaname = 'public' AND matviewname = 'item_popularity_mv';
-- Should return: 1
```

### Check Materialized View Data

```sql
-- See current data in the materialized view
SELECT 
  printing_id,
  sales_30d,
  cart_adds_30d,
  popularity_score,
  refreshed_at
FROM public.item_popularity_mv
ORDER BY popularity_score DESC
LIMIT 10;

-- Expected: Should show items with recent sales/cart adds
-- If empty or all zeros, you need recent OrderItem/CartItem data
```

### Verify Recent Activity

```sql
-- Check for recent orders (last 30 days)
SELECT COUNT(*) as recent_orders
FROM "Order"
WHERE "createdAt" >= now() - interval '30 days'
  AND (status IN ('paid','completed','fulfilled','shipped') OR status IS NULL);

-- Check for recent cart adds (last 30 days)
SELECT COUNT(*) as recent_cart_adds
FROM "CartItem"
WHERE "createdAt" >= now() - interval '30 days';
```

## Step 2: Manual UI Testing

### Test 1: Sort Dropdown

1. Navigate to `/mtg/search` or perform a search
2. **Verify**: "Most Popular" option appears in the sort dropdown
3. **Verify**: "Most Popular" is the first option (when enabled)
4. **Verify**: Selecting "Most Popular" updates the URL parameter: `?sort=most-popular`

### Test 2: Default Behavior

1. Navigate to `/mtg/search` without any sort parameter
2. **Expected**: Results should be sorted by "Most Popular" (if `MOST_POPULAR_ENABLED=true`)
3. **Verify**: URL shows `?sort=most-popular` (or no sort, but API uses most-popular as default)

### Test 3: Sort Ordering

1. Perform a search (e.g., search for "Lightning Bolt")
2. Select "Most Popular" from sort dropdown
3. **Verify**: Results are ordered by:
   - Items with highest popularity_score first
   - For same score: newest release date first
   - For same score and date: alphabetical by title
4. **Verify**: Items with no popularity data (score = 0) appear at the end

### Test 4: Compare with Other Sorts

1. Search for the same query
2. Test each sort option:
   - **Most Popular**: Should show items with sales/cart adds first
   - **Relevance**: Should show items matching search query best
   - **Price: Low → High**: Should show cheapest items first
   - **Price: High → Low**: Should show most expensive items first
   - **Name: A → Z**: Should show alphabetical order
   - **Name: Z → A**: Should show reverse alphabetical order

3. **Verify**: Each sort produces different ordering (if data supports it)

## Step 3: API Testing

### Test API Endpoint Directly

```bash
# Test with most-popular sort
curl "http://localhost:3000/api/search?q=lightning&sort=most-popular" | jq '.primary[0:5] | .[] | {title, id}'

# Test without sort (should default to most-popular if enabled)
curl "http://localhost:3000/api/search?q=lightning" | jq '.primary[0:5] | .[] | {title, id}'

# Compare with relevance sort
curl "http://localhost:3000/api/search?q=lightning&sort=relevance" | jq '.primary[0:5] | .[] | {title, id}'
```

### Verify Response Structure

The API response should include:
- `primary`: Array of search results
- Results should be ordered by popularity_score (when sort=most-popular)
- Check that items with higher popularity appear first

## Step 4: Database Query Verification

### Verify the Query Uses Popularity MV

```sql
-- This simulates what the search query does
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  si.id,
  si.title,
  COALESCE(ip.popularity_score, 0) AS popularity_score,
  si."releasedAt"
FROM "SearchIndex" si
JOIN "MtgCard" mc ON mc."scryfallId" = si.id
LEFT JOIN public.item_popularity_mv ip ON ip.printing_id = si.id
WHERE si.game = 'mtg' AND si."isPaper" = true
  AND si.title ILIKE '%lightning%'
ORDER BY 
  ip.popularity_score DESC NULLS LAST,
  COALESCE(si."releasedAt", mc."releasedAt") DESC NULLS LAST,
  si.title ASC NULLS LAST
LIMIT 10;

-- Verify:
-- 1. LEFT JOIN to item_popularity_mv is present
-- 2. ORDER BY includes popularity_score
-- 3. Query executes without errors
```

### Check Popularity Scores Match Expectations

```sql
-- Get top 10 most popular items
SELECT 
  si.id,
  si.title,
  ip.popularity_score,
  ip.sales_30d,
  ip.cart_adds_30d,
  si."releasedAt"
FROM "SearchIndex" si
LEFT JOIN public.item_popularity_mv ip ON ip.printing_id = si.id
WHERE si.game = 'mtg' AND si."isPaper" = true
ORDER BY COALESCE(ip.popularity_score, 0) DESC, si."releasedAt" DESC NULLS LAST
LIMIT 10;

-- Verify:
-- 1. Items with recent sales/cart adds have higher scores
-- 2. Score calculation: sales_30d * 1.0 + cart_adds_30d * 0.6
-- 3. Items with no data have NULL popularity_score (sorted last)
```

## Step 5: Cron Job Verification

### Test Refresh Endpoint

```bash
# Test the refresh endpoint (requires CRON_SECRET)
curl -X POST "http://localhost:3000/api/jobs/refresh-popularity" \
  -H "Authorization: Bearer $CRON_SECRET"

# Expected response:
# {
#   "ok": true,
#   "durationMs": <number>,
#   "rows": <number>,
#   "maxScore": <number or null>,
#   "avgScore": <number or null>,
#   "refreshedAt": "2025-11-04T..."
# }
```

### Verify Refresh Updates Data

```sql
-- Check refresh timestamp
SELECT 
  COUNT(*) as total_rows,
  MAX(refreshed_at) as last_refresh,
  MAX(popularity_score) as max_score,
  AVG(popularity_score) as avg_score
FROM public.item_popularity_mv;

-- After running refresh, last_refresh should update
```

### Check Cron Job Schedule

Verify in `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/jobs/refresh-popularity", "schedule": "*/15 * * * *" }
  ]
}
```

## Step 6: Expected Behavior Checklist

- [ ] Materialized view exists and has data
- [ ] "Most Popular" appears in sort dropdown
- [ ] "Most Popular" is default when `MOST_POPULAR_ENABLED=true`
- [ ] Selecting "Most Popular" changes URL parameter
- [ ] Results are ordered by popularity_score (highest first)
- [ ] Items with same score are ordered by release date (newest first)
- [ ] Items with same score and date are ordered alphabetically
- [ ] Items with no popularity data (score = 0) appear at the end
- [ ] Other sort options still work correctly
- [ ] Search filters (sets, rarity, printing) work with most-popular sort
- [ ] Pagination works correctly with most-popular sort
- [ ] API endpoint returns correct ordering
- [ ] Refresh endpoint updates materialized view
- [ ] No console errors when using most-popular sort

## Step 7: Troubleshooting

### Issue: "column popularity_score does not exist"

**Solution**: Make sure `popularity_score` is included in all CTEs:
- Check `src/services/searchOptimized.ts` lines 236, 260, 269
- Check `src/services/searchQueryGroupedSimple.ts` for LEFT JOIN

### Issue: All items show same order (no difference from relevance)

**Possible Causes**:
1. Materialized view is empty (no recent sales/cart adds)
2. Materialized view hasn't been refreshed
3. All items have popularity_score = 0

**Solution**:
```sql
-- Check if view has data
SELECT COUNT(*) FROM public.item_popularity_mv WHERE popularity_score > 0;

-- If empty, create test data or wait for real sales/cart activity
```

### Issue: "Most Popular" not appearing in dropdown

**Check**:
1. UI component includes the option: `src/components/SearchResultsGrid.tsx` line 477
2. SortOption type includes 'most-popular': `src/search/sort.ts` line 1

### Issue: Default sort not using most-popular

**Check**:
1. `MOST_POPULAR_ENABLED=true` in environment
2. API route defaults: `src/app/api/search/route.ts` line 44-46
3. UI default: `src/components/SearchResultsGrid.tsx` line 461

### Issue: Materialized view not refreshing

**Check**:
1. Cron job is configured in `vercel.json`
2. Refresh endpoint is accessible: `/api/jobs/refresh-popularity`
3. Check logs for refresh errors

## Step 8: Performance Verification

### Check Query Performance

```sql
-- Test query performance with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS)
SELECT ... -- (use the query from Step 4)

-- Verify:
-- 1. Index scan on item_popularity_mv (idx_item_popularity_mv_pk)
-- 2. Index scan on popularity_score (idx_item_popularity_mv_score)
-- 3. Query completes in < 100ms for typical searches
```

### Monitor Logs

Check for:
- Search query latency (should be similar to other sorts)
- No N+1 query issues
- Cache hit rates (if caching is enabled)

## Step 9: Edge Cases

### Test with Empty Results

1. Search for something that returns no results
2. Verify no errors occur with most-popular sort

### Test with No Popularity Data

1. Search when materialized view is empty
2. Verify all items appear (ordered by release date, then title)
3. No errors should occur

### Test with Filtered Results

1. Apply filters (sets, rarity, printing)
2. Use most-popular sort
3. Verify filtering and sorting work together correctly

## Success Criteria

✅ The "Most Popular" sort option works correctly when:
1. Materialized view is populated with data
2. Results are ordered by popularity_score (highest first)
3. Tie-breakers work (release date, then title)
4. Items with no data appear at the end
5. No errors occur in console or API
6. Performance is acceptable (< 200ms for typical searches)
7. Other sorts continue to work
8. Refresh mechanism updates data correctly

