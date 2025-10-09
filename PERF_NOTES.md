# Search Facets Performance Optimization

## Overview

This document describes the performance optimizations implemented for search facets computation in the LatamTCG MTG catalog. The optimizations focus on reducing database load and improving response times for facet aggregation without changing business logic or API response shapes.

## Performance Goals

- **Cold Run**: Reduce `db_facets_ms` from ~14s to < 900ms for heavy queries like `q="swamp"`
- **Warm Run**: Serve facets from cache in < 10ms
- **Maintain**: Identical search results order and API response shapes

## Architecture Changes

### 1. Candidate-Based Facet Aggregation

**Before**: Each facet query scanned the entire `SearchIndex` + `MtgCard` tables independently.

**After**: Facets are computed over pre-resolved candidate IDs using a `WITH candidates AS (...)` CTE.

```sql
WITH candidates AS (
  SELECT * FROM unnest(
    candidate_ids::text[],
    candidate_set_codes::text[],
    candidate_rarities::text[],
    candidate_finishes::text[][]
  ) AS t(id, set_code, rarity, finishes)
),
facet_data AS (
  -- Single aggregation for all facets using UNION ALL
  SELECT 'sets' as facet_type, set_code as facet_key, ...
  UNION ALL
  SELECT 'rarity' as facet_type, rarity as facet_key, ...
  UNION ALL
  SELECT 'printing' as facet_type, finish as facet_key, ...
)
```

### 2. Single Query Facet Computation

**Before**: 5 separate database queries (sets, rarity, 3 printing queries).

**After**: 1 consolidated query using `UNION ALL` with `GROUP BY` aggregations.

### 3. Separate Facet Caching

**Before**: Facets cache key included `sort`, `page`, `limit` causing unnecessary cache misses.

**After**: Separate cache keys for items and facets:
- **Items Key**: `{q, mode, filters, sort, page, limit}`
- **Facets Key**: `{q, mode, filters}` (excludes pagination)

### 4. SWR (Stale-While-Revalidate) Caching

**Implementation**: 
- Serve stale facets for 5 seconds while refreshing in background
- Single-flight protection prevents cache stampede
- Configurable TTLs via environment variables

### 5. Database Indexes

**Added Covering Indexes**:
```sql
-- Avoid heap lookups during facet computation
CREATE INDEX CONCURRENTLY idx_mtgcard_facets_cover
  ON "MtgCard" (id) INCLUDE (set_code, rarity, finishes);

-- Support SearchIndex to MtgCard joins
CREATE INDEX CONCURRENTLY idx_mtgcard_scryfall_lookup
  ON "MtgCard" (scryfall_id) INCLUDE (id, set_code, rarity, finishes);
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FACETS_TTL_FRESH` | `180` | Fresh cache TTL in seconds |
| `FACETS_TTL_STALE` | `5` | Stale cache TTL in seconds |
| `FACETS_WORK_MEM` | `64MB` | PostgreSQL work_mem for facet queries |
| `FACETS_LIMIT` | unset | Optional limit per facet dimension |
| `EXPLAIN_FACETS` | `0` | Enable query plan logging (dev only) |
| `CACHE_DRIVER` | `memory` | Cache backend (`memory` or `redis`) |

### Feature Flags

- **FACETS_LIMIT**: When set, limits each facet dimension to top-N by count DESC
- **EXPLAIN_FACETS**: Logs query execution plans in development

## Performance Monitoring

### Log Events

**Facet Cache Events**:
```json
{
  "event": "facets.cache",
  "op": "hit|miss|set",
  "driver": "memory|redis",
  "keyHash": 123,
  "fresh": true,
  "latencyMs": 5
}
```

**Search Performance**:
```json
{
  "event": "search.perf",
  "q": "swamp",
  "timingsMs": {
    "total": 150,
    "db_items_ms": 100,
    "db_facets_ms": 25,
    "cache_ms": 0
  },
  "facets_count": {
    "sets": 15,
    "rarity": 4,
    "printing": 3
  }
}
```

## Implementation Details

### File Structure

```
src/services/
├── facetsOptimized.ts          # New optimized implementation
├── searchQueryGroupedSimple.ts # Updated to use optimized facets
└── __tests__/
    └── facetsOptimized.spec.ts # Unit tests

prisma/migrations/
└── 20250115130000_facets_performance_indexes/
    └── migration.sql           # Database indexes
```

### Key Functions

- `buildFacetsOptimized()`: Main optimized facets computation
- `buildFacetCacheKey()`: Separate cache key builder for facets
- `getCandidates()`: Extract candidate IDs for facet aggregation
- `computeFacetsFromCandidates()`: Single-query facet computation

## Migration Strategy

### Safe Deployment

1. **Additive Changes**: All optimizations are behind feature flags
2. **Backward Compatible**: Existing API contracts unchanged
3. **Gradual Rollout**: Can be enabled per environment
4. **Rollback Ready**: Can revert to original implementation

### Database Migrations

- **CONCURRENTLY**: Indexes created without blocking traffic
- **IF NOT EXISTS**: Safe to run multiple times
- **Isolated**: Each migration in separate file

## Testing

### Unit Tests

- Facet cache key separation
- Single query facet computation
- SWR caching behavior
- Error handling and fallbacks

### Performance Tests

- Cold run benchmarks (q="swamp")
- Warm run cache hit validation
- Memory usage monitoring
- Database query plan verification

## Rollback Plan

If issues arise:

1. **Immediate**: Set `FACETS_OPTIMIZED=false` environment variable
2. **Code**: Revert `searchQueryGroupedSimple.ts` to original `buildFacets()` implementation
3. **Database**: Indexes can remain (they're beneficial for other queries)

## Success Metrics

### Before Optimization
- `db_facets_ms`: ~14,000ms for heavy queries
- Database queries: 5 separate facet queries
- Cache misses: Frequent due to pagination in cache key

### After Optimization
- `db_facets_ms`: < 900ms for heavy queries
- Database queries: 1 consolidated facet query
- Cache hits: High due to separate facet cache keys
- Memory usage: Reduced due to covering indexes

## Future Enhancements

1. **Materialized Views**: Pre-compute popular facet combinations
2. **Async Facet Updates**: Background refresh of stale facets
3. **Facet Preloading**: Cache common facet queries
4. **Query Optimization**: Further PostgreSQL tuning

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Adjust `FACETS_WORK_MEM`
2. **Cache Misses**: Check `CACHE_DRIVER` configuration
3. **Slow Queries**: Enable `EXPLAIN_FACETS=1` for query analysis
4. **Index Issues**: Verify migration completed successfully

### Debug Commands

```bash
# Check index usage
EXPLAIN (ANALYZE, BUFFERS) SELECT ... FROM MtgCard WHERE ...

# Monitor cache performance
grep "facets.cache" logs/

# Verify facet counts
curl "api/search?q=swamp&debug=1"
```
