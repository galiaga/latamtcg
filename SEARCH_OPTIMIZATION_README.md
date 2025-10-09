# Search Performance Optimizations

This document describes the performance optimizations implemented to address the 20+ second search query times.

## Problem Analysis

The original search implementation had several performance bottlenecks:

1. **Complex Regex Queries**: Using `~*` regex patterns with `unaccent(lower())` functions on every row
2. **Multiple Query Stages**: Running separate queries for word boundary, contains, and fuzzy matches
3. **Expensive JOINs**: `SearchIndex` JOIN `MtgCard` JOIN `Set` with complex WHERE conditions
4. **Facets Computation**: Running separate candidate queries and facet aggregation queries
5. **Missing Indexes**: No optimized indexes for the specific query patterns

## Optimizations Implemented

### 1. Database Indexes (`20250116000000_search_performance_optimization`)

- **Trigram Index**: `idx_searchindex_title_unaccent_trgm` for fast regex searches
- **Composite Index**: `idx_searchindex_mtg_paper_en_composite` for common search patterns
- **Covering Indexes**: Include all needed columns to avoid heap lookups
- **Partial Indexes**: Optimize for available cards only (most common case)

### 2. Optimized Search Implementation (`searchOptimized.ts`)

- **Single Query**: Combines all search stages (word boundary, contains, fuzzy) in one query
- **Smart Scoring**: Prioritizes word boundary matches over contains matches over fuzzy matches
- **Window Functions**: Uses `ROW_NUMBER()` and `COUNT(*) OVER()` for pagination and totals
- **Candidate-Based Facets**: Pre-computes candidate IDs for faster facet aggregation

### 3. Fallback Strategy

- **Environment Control**: `SEARCH_OPTIMIZATION_ENABLED` to enable/disable optimizations
- **Graceful Degradation**: Falls back to original implementation if optimized version fails
- **Performance Monitoring**: Detailed logging of query performance metrics

## Usage

### Enable Optimizations (Default)

```bash
# Optimizations are enabled by default
# To disable, set:
export SEARCH_OPTIMIZATION_ENABLED=false
```

### Enable Query Analysis

```bash
# Enable EXPLAIN analysis for optimized queries
export EXPLAIN_OPTIMIZED_SEARCH=1
```

### Test Performance

```bash
# Run performance comparison tests
npx tsx scripts/test-search-performance.ts
```

## Expected Performance Improvements

- **Cold Run**: Reduce search time from ~24s to < 2s for complex queries
- **Warm Run**: Serve cached results in < 100ms
- **Facets**: Reduce facet computation from ~2s to < 200ms
- **Database Load**: Reduce from multiple complex queries to single optimized query

## Monitoring

The optimizations include comprehensive logging:

```json
{
  "event": "search.perf",
  "q": "aabcdefgzzzz",
  "timingsMs": {
    "total": 1500,
    "db_items_ms": 1200,
    "db_facets_ms": 300
  },
  "warn": "slow"
}
```

## Migration

1. **Apply Database Migration**: Run the new indexes migration
2. **Deploy Code**: The optimized search is enabled by default
3. **Monitor Performance**: Watch logs for performance improvements
4. **Rollback if Needed**: Set `SEARCH_OPTIMIZATION_ENABLED=false` to disable

## Technical Details

### Query Optimization Strategy

The optimized search uses a single CTE (Common Table Expression) query that:

1. **Combines Search Stages**: Word boundary, contains, and fuzzy matching in one query
2. **Smart Scoring**: Different scores for different match types
3. **Window Functions**: Efficient pagination and total count calculation
4. **Covering Indexes**: Avoids heap lookups by including all needed columns

### Facet Optimization

Facets are computed using:

1. **Pre-computed Candidates**: Uses candidate IDs from the main search
2. **Single Aggregation Query**: All facets computed in one query using `UNION ALL`
3. **Efficient Grouping**: Uses `GROUP BY` with proper indexes

### Index Strategy

The new indexes are designed for:

1. **Trigram Searches**: Fast regex pattern matching
2. **Common Filters**: `game='mtg'`, `isPaper=true`, `lang='en'`
3. **JOIN Optimization**: Covering indexes for SearchIndex → MtgCard joins
4. **Partial Indexes**: Only index relevant rows (available cards)

## Compatibility

- **API Compatibility**: No changes to API response format
- **Business Logic**: Identical search results and ranking
- **Fallback Support**: Original implementation available as fallback
- **Environment Control**: Can be enabled/disabled via environment variable
