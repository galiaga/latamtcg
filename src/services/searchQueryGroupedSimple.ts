import { prisma } from '@/lib/prisma'
import { cacheGetJSON, cacheSetJSON } from '@/lib/cache'
import type { SortOption } from '@/search/sort'
import { parseSortParam } from '@/search/sort'
import { Prisma } from '@prisma/client'
import type { SearchResult, SearchResultItem, SearchFacets } from '@/types/search'
import { buildFacetsOptimized } from './facetsOptimized'
import { optimizedSearch, optimizedFacets } from './searchOptimized'

// Helper function to safely create ANY() conditions
function safeAnyCondition<T>(array: T[], column: string, transform?: (val: T) => string): Prisma.Sql {
  if (!Array.isArray(array) || array.length === 0) {
    return Prisma.sql``
  }
  
  const validArray = array.filter(val => val != null && val !== '')
  if (validArray.length === 0) {
    return Prisma.sql``
  }
  
  if (transform) {
    return Prisma.sql`AND ${Prisma.raw(column)} = ANY(${validArray.map(transform)})`
  }
  
  return Prisma.sql`AND ${Prisma.raw(column)} = ANY(${validArray})`
}

// Helper function to safely create upper() ANY() conditions
function safeUpperAnyCondition(array: string[], column: string): Prisma.Sql {
  if (!Array.isArray(array) || array.length === 0) {
    return Prisma.sql``
  }
  
  const validArray = array.filter(val => val != null && val !== '' && typeof val === 'string')
  if (validArray.length === 0) {
    return Prisma.sql``
  }
  
  return Prisma.sql`AND upper(${Prisma.raw(column)}) = ANY(${validArray})`
}

type GroupedParams = {
  q: string
  page?: number
  pageSize?: number
  exactOnly?: boolean
  // filters
  printing?: Array<'normal' | 'foil' | 'etched'>
  sets?: string[]
  rarity?: Array<'common' | 'uncommon' | 'rare' | 'mythic'>
  groupId?: string | null
  facetAll?: boolean
  sort?: SortOption
  mode?: 'name' | 'text' | 'all'
  debug?: boolean
  showUnavailable?: boolean
}

export type GroupedResult = SearchResult

function normalize(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildOrderByClause(sort: SortOption): Prisma.Sql {
  switch (sort) {
    case 'name_asc':
      return Prisma.sql`si.title ASC NULLS LAST, si."releasedAt" DESC NULLS LAST, si."setCode" ASC NULLS LAST, si."collectorNumber" ASC NULLS LAST`
    case 'name_desc':
      return Prisma.sql`si.title DESC NULLS LAST, si."releasedAt" DESC NULLS LAST, si."setCode" ASC NULLS LAST, si."collectorNumber" ASC NULLS LAST`
    case 'price_asc':
      return Prisma.sql`COALESCE(mc."priceUsd", mc."priceUsdFoil", mc."priceUsdEtched") ASC NULLS LAST`
    case 'price_desc':
      return Prisma.sql`COALESCE(mc."priceUsd", mc."priceUsdFoil", mc."priceUsdEtched") DESC NULLS LAST`
    case 'release_desc':
      return Prisma.sql`si."releasedAt" DESC NULLS LAST`
    default:
      return Prisma.sql`score DESC, si."releasedAt" DESC NULLS LAST`
  }
}

// Optimized grouped search function with improved performance
export async function groupedSearchOptimized(params: GroupedParams): Promise<GroupedResult> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(25, Math.max(1, params.pageSize || 25))
  const sort = parseSortParam(params.sort || 'relevance')
  
  const groupId = (params.groupId || '').trim()
  const printing = Array.isArray(params.printing) ? params.printing : []
  const rarity = Array.isArray(params.rarity) ? params.rarity : []
  const setList = Array.isArray(params.sets) ? params.sets.filter(Boolean).map((s) => s.toUpperCase()) : []
  const showUnavailable = Boolean(params.showUnavailable)

  // Parse query for exact mode and tokens
  const isExactOnly = params.exactOnly || (params.q?.startsWith('"') && params.q?.endsWith('"'))
  const query = isExactOnly && params.q?.startsWith('"') ?
    params.q.slice(1, -1).trim() : params.q || ''
  
  const queryTokens = query.length > 0 ? 
    query.toLowerCase().split(/\s+/).filter(t => t.length > 0) : []

  const t0 = Date.now()
  
  try {
    // Use optimized search for better performance
    const searchResult = await optimizedSearch({
      queryTokens,
      groupId,
      setList,
      printing,
      rarity,
      showUnavailable,
      page,
      pageSize,
      sort
    })

    const t1 = Date.now()
    
    // Convert to expected format
    const items: SearchResultItem[] = searchResult.items.map((item) => ({
      id: item.id,
      groupId: item.groupId,
      title: item.title,
      subtitle: item.subtitle,
      imageNormalUrl: item.imageNormalUrl,
      setCode: item.setCode,
      setName: item.setName,
      collectorNumber: item.collectorNumber,
      variantLabel: item.variantLabel,
      finishLabel: item.finishLabel,
      variantSuffix: item.variantSuffix,
      releasedAt: item.releasedAt > 0 ? new Date(item.releasedAt * 1000).toISOString() : null,
      priceUsd: item.priceUsd,
      priceUsdFoil: item.priceUsdFoil,
      priceUsdEtched: item.priceUsdEtched,
      rarity: item.rarity,
      hasNonfoil: item.hasNonfoil,
      hasFoil: item.hasFoil,
      hasEtched: item.hasEtched,
      priceSort: item.priceUsd || item.priceUsdFoil || item.priceUsdEtched || null,
      rel: item.releasedAt || null,
    }))

    // Compute facets using optimized implementation
    const facets = await optimizedFacets(searchResult.candidateIds)
    
    const t2 = Date.now()
    
    // Log performance metrics
    console.log(JSON.stringify({
      event: 'search.perf',
      q: params.q,
      filters: { printing, sets: setList, rarity, groupId, sort },
      timingsMs: {
        total: t2 - t0,
        db_items_ms: t1 - t0,
        db_facets_ms: t2 - t1,
        cache_ms: 0,
        serialize_ms: 0
      },
      facets_count: {
        sets: facets.sets.length,
        rarity: facets.rarity.length,
        printing: facets.printing.length
      },
      warn: (t2 - t0) > 700 ? 'slow' : undefined,
    }))

    return {
      query: params.q || '',
      page,
      pageSize,
      totalResults: searchResult.totalResults,
      primary: items,
      otherNameMatches: [],
      broad: [],
      nextPageToken: searchResult.hasMore ? String(page + 1) : null,
      facets
    }
  } catch (error) {
    console.error('Error in optimized grouped search:', error)
    
    // Fallback to original implementation
    console.log(JSON.stringify({
      event: 'search.fallback',
      reason: 'optimized_search_failed',
      error: String(error)
    }))
    
    return groupedSearchOriginal(params)
  }
}

// Original grouped search function (kept as fallback)
export async function groupedSearchOriginal(params: GroupedParams): Promise<GroupedResult> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(25, Math.max(1, params.pageSize || 25))
  const sort = parseSortParam(params.sort || 'relevance')
  
  // Log sorting information for observability
  const orderByUsed = sort === 'name_asc' ? 'nameSortKey' : 
                     sort === 'name_desc' ? 'nameSortKeyDesc' : 
                     sort === 'price_asc' ? 'priceUsd_asc' :
                     sort === 'price_desc' ? 'priceUsd_desc' :
                     sort === 'release_desc' ? 'releasedAt_desc' : 'relevance'
  
  try {
    console.log(JSON.stringify({
      event: 'search.sorting',
      q: params.q,
      sort: sort,
      orderByUsed: orderByUsed,
      path: 'groupedSearch'
    }))
  } catch {}
  const groupId = (params.groupId || '').trim()
  
  // Allow empty query when filters (like set) are provided
  const hasFilters = (Array.isArray(params.printing) && params.printing.length > 0)
    || (Array.isArray(params.rarity) && params.rarity.length > 0)
    || (Array.isArray(params.sets) && params.sets.length > 0)
  
  const printing = Array.isArray(params.printing) ? params.printing : []
  const rarity = Array.isArray(params.rarity) ? params.rarity : []
  const setList = Array.isArray(params.sets) ? params.sets.filter(Boolean).map((s) => s.toUpperCase()) : []
  const showUnavailable = Boolean(params.showUnavailable)

  // Map frontend printing values to database values
  const mapPrintingToDb = (printing: string[]): string[] => {
    return printing.map(p => p === 'normal' ? 'nonfoil' : p)
  }
  
  // Map database printing values back to frontend values
  const mapPrintingFromDb = (printing: string[]): string[] => {
    return printing.map(p => p === 'nonfoil' ? 'normal' : p)
  }
  
  const dbPrinting = mapPrintingToDb(printing)

  // Parse query for exact mode and tokens
  const isExactOnly = params.exactOnly || (params.q?.startsWith('"') && params.q?.endsWith('"'))
  const query = isExactOnly && params.q?.startsWith('"') ? params.q.slice(1, -1) : params.q || ''
  const qClean = normalize(query)
  const queryTokens = qClean.split(/\s+/).filter(t => t.length > 0)
  
  if (queryTokens.length === 0 && !groupId && !hasFilters) {
    return { query: params.q || '', page, pageSize, totalResults: 0, primary: [], otherNameMatches: [], broad: [], nextPageToken: null, facets: { sets: [], rarity: [], printing: [] } }
  }

  const tStart = Date.now()
  const itemsKey = JSON.stringify({ kind: 'items', q: params.q || '', page, pageSize, printing, sets: setList, rarity, groupId, sort })
  const facetsKey = JSON.stringify({ kind: 'facets', q: params.q || '', printing, sets: setList, rarity, groupId })
  const ttlSeconds = 300
  
  try {
    const cached = await cacheGetJSON<GroupedResult>(itemsKey)
    if (cached) {
      try { console.log(JSON.stringify({ event: 'search.cache_hit', keyLen: itemsKey.length, savedMs: 'unknown' })) } catch {}
      return cached
    }
  } catch {}
  
  // Use the same approach as the working suggestions search
  let itemsRaw: any[] = []
  
  if (queryTokens.length > 0) {
    // Stage 1: Starts-With matches (word boundary logic)
    const wordBoundaryConditions = queryTokens.map(token => 
      Prisma.sql`unaccent(lower(si.title)) ~* ${'\\m' + token}`
    )
    
    // Also try contains matching for better coverage of multi-word queries
    const containsConditions = queryTokens.map(token => 
      Prisma.sql`unaccent(lower(si.title)) ~* ${token}`
    )
    
    try {
      // Add EXPLAIN for items query if enabled
      if (process.env.EXPLAIN_ITEMS === '1') {
        const explainResult = await prisma.$queryRaw<Array<{query_plan: string}>>(
          Prisma.sql`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT
              si.id, si."groupId", si.title, si."subtitle", si."imageNormalUrl", si."setCode",
              COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
              si."variantLabel", si."finishLabel", si."variantSuffix",
              COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS releasedAt,
              mc."priceUsd",
              mc."priceUsdFoil", 
              mc."priceUsdEtched",
              mc.rarity,
              (CASE WHEN mc."priceUsd" IS NOT NULL THEN true ELSE false END) AS hasNonfoil,
              (CASE WHEN mc."priceUsdFoil" IS NOT NULL THEN true ELSE false END) AS hasFoil,
              (CASE WHEN mc."priceUsdEtched" IS NOT NULL THEN true ELSE false END) AS hasEtched,
              (${queryTokens.length * 100} + 
               CASE WHEN si.lang = 'en' THEN 1 ELSE 0 END +
               CASE WHEN si."isPaper" THEN 1 ELSE 0 END) AS score
            FROM "public"."SearchIndex" si
            JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
            LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
            WHERE si.game = 'mtg' AND si."isPaper" = true
              AND (${Prisma.join(wordBoundaryConditions, ' AND ')} OR ${Prisma.join(containsConditions, ' AND ')})
              ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
              ${safeUpperAnyCondition(setList, 'si."setCode"')}
              ${printing.length > 0 ? Prisma.sql`AND mc.finishes && ${printing}` : Prisma.sql``}
              ${safeAnyCondition(rarity, 'mc.rarity')}
              ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
            ORDER BY ${buildOrderByClause(sort)}
            LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
          `
        )
        // Log EXPLAIN in chunks of 2-3 lines
        const explainText = explainResult.map(r => r.query_plan).join('\n')
        const lines = explainText.split('\n')
        for (let i = 0; i < lines.length; i += 2) {
          const chunk = lines.slice(i, i + 2).join('\n')
          console.log(JSON.stringify({
            event: 'items.explain',
            line: i + 1,
            text: chunk
          }))
        }
      }

      itemsRaw = await prisma.$queryRaw(
        Prisma.sql`
          SELECT
            si.id, si."groupId", si.title, si."subtitle", si."imageNormalUrl", si."setCode",
            COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
            si."variantLabel", si."finishLabel", si."variantSuffix",
            COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS releasedAt,
            mc."priceUsd",
            mc."priceUsdFoil", 
            mc."priceUsdEtched",
            mc."computedPriceClp",
            mc.rarity,
            (CASE WHEN mc."priceUsd" IS NOT NULL THEN true ELSE false END) AS hasNonfoil,
            (CASE WHEN mc."priceUsdFoil" IS NOT NULL THEN true ELSE false END) AS hasFoil,
            (CASE WHEN mc."priceUsdEtched" IS NOT NULL THEN true ELSE false END) AS hasEtched,
            -- High score for starts-with matches
            (${queryTokens.length * 100} + 
             CASE WHEN si.lang = 'en' THEN 1 ELSE 0 END +
             CASE WHEN si."isPaper" THEN 1 ELSE 0 END) AS score
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
          WHERE si.game = 'mtg' AND si."isPaper" = true
            AND (${Prisma.join(wordBoundaryConditions, ' AND ')} OR ${Prisma.join(containsConditions, ' AND ')})
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${safeUpperAnyCondition(setList, 'si."setCode"')}
            ${printing.length > 0 ? Prisma.sql`AND (
              ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
              ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
              ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
            )` : Prisma.sql``}
            ${safeAnyCondition(rarity, 'mc.rarity')}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
          ORDER BY ${buildOrderByClause(sort)}
          LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
        `
      )
      
      // Stage 2: Contains matches (if no starts-with results)
      if (itemsRaw.length === 0) {
        const containsConditions = queryTokens.map(token => 
          Prisma.sql`unaccent(lower(si.title)) ILIKE ${'%' + token + '%'}`
        )
        
        itemsRaw = await prisma.$queryRaw(
          Prisma.sql`
            SELECT
              si.id, si."groupId", si.title, si."subtitle", si."imageNormalUrl", si."setCode",
              COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
              si."variantLabel", si."finishLabel", si."variantSuffix",
              COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS releasedAt,
              mc."priceUsd",
              mc."priceUsdFoil", 
              mc."priceUsdEtched",
              mc.rarity,
            (CASE WHEN mc."priceUsd" IS NOT NULL THEN true ELSE false END) AS hasNonfoil,
            (CASE WHEN mc."priceUsdFoil" IS NOT NULL THEN true ELSE false END) AS hasFoil,
            (CASE WHEN mc."priceUsdEtched" IS NOT NULL THEN true ELSE false END) AS hasEtched,
              -- Lower score for contains matches
              (${queryTokens.length * 50} + 
               CASE WHEN si.lang = 'en' THEN 1 ELSE 0 END +
               CASE WHEN si."isPaper" THEN 1 ELSE 0 END) AS score
            FROM "public"."SearchIndex" si
            JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
            LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
            WHERE si.game = 'mtg' AND si."isPaper" = true
              AND (${Prisma.join(containsConditions, ' AND ')})
              ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
              ${safeUpperAnyCondition(setList, 'si."setCode"')}
              ${printing.length > 0 ? Prisma.sql`AND (
              ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
              ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
              ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
            )` : Prisma.sql``}
              ${safeAnyCondition(rarity, 'mc.rarity')}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
            ORDER BY 
            ${buildOrderByClause(sort)}
            LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
          `
        )
      }
    } catch (error) {
      console.error('Search query error:', error)
      return { query: params.q || '', page, pageSize, totalResults: 0, primary: [], otherNameMatches: [], broad: [], nextPageToken: null, facets: { sets: [], rarity: [], printing: [] } }
    }
  } else if (hasFilters || groupId) {
    // No query tokens but has filters - return empty result for now
    return { query: params.q || '', page, pageSize, totalResults: 0, primary: [], otherNameMatches: [], broad: [], nextPageToken: null, facets: { sets: [], rarity: [], printing: [] } }
  } else {
    // No query tokens and no filters - return empty result
    return { query: params.q || '', page, pageSize, totalResults: 0, primary: [], otherNameMatches: [], broad: [], nextPageToken: null, facets: { sets: [], rarity: [], printing: [] } }
  }

  // Process results and build response
  const tAfterItems = Date.now()
  
  // Numeric coercion helper
  function asNum(v: unknown): number | null {
    if (v === null || v === undefined) return null
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  
  const hasMore = itemsRaw.length > pageSize
  const items = itemsRaw.slice(0, pageSize).map((row): SearchResultItem => ({
    id: row.id,
    groupId: row.groupId,
    title: row.title,
    imageNormalUrl: row.imageNormalUrl,
    setCode: row.setCode,
    setName: row.setName,
    collectorNumber: row.collectorNumber,
    variantLabel: row.variantLabel,
    finishLabel: row.finishLabel,
    variantSuffix: row.variantSuffix,
    priceUsd: asNum(row.priceUsd),
    priceUsdFoil: asNum(row.priceUsdFoil),
    priceUsdEtched: asNum(row.priceUsdEtched),
    rarity: row.rarity,
    hasNonfoil: Boolean(row.hasNonfoil),
    hasFoil: Boolean(row.hasFoil),
    hasEtched: Boolean(row.hasEtched),
    priceSort: null,
    rel: asNum(row.releasedAt),
  }))

  // Debug logging for price sorting
  console.log(JSON.stringify({
    event: 'search.debug.sort',
    fieldUsed: orderByUsed,
    order: sort,
    firstPrices: items.slice(0, 5).map(r => ({
      title: r.title,
      priceUsd: r.priceUsd,
      priceUsdFoil: r.priceUsdFoil,
      priceUsdEtched: r.priceUsdEtched,
      displayPrice: r.priceUsd || r.priceUsdFoil || r.priceUsdEtched
    }))
  }))

  // Get additional candidates for facet computation (up to 3000, not just paginated 25)
  const facetCandidateIds = await getFacetCandidates({ queryTokens, groupId, setList, printing: dbPrinting, rarity, showUnavailable })
  
  // Ensure we always pass a valid array to facets computation
  const safeCandidateIds = Array.isArray(facetCandidateIds) ? facetCandidateIds : []

  // Build facets with timing
  const tBeforeFacets = Date.now()
  const facets = await buildFacets({ queryTokens, groupId, setList, printing: dbPrinting, rarity, facetsKey, showUnavailable, candidateIds: safeCandidateIds, idType: 'scryfall_id' })
  const tAfterFacets = Date.now()

  // Get accurate total count for pagination
  let totalResults = items.length + (hasMore ? 1 : 0) // Default fallback
  if (queryTokens.length > 0) {
    try {
      const wordBoundaryConditions = queryTokens.map(token =>
        Prisma.sql`unaccent(lower(si.title)) ~* ${'\\m' + token}`
      )
      
      const containsConditions = queryTokens.map(token =>
        Prisma.sql`unaccent(lower(si.title)) ~* ${token}`
      )
      
      const countResult = await prisma.$queryRaw(
        Prisma.sql`
          SELECT COUNT(*) as count
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          WHERE si.game = 'mtg' AND si."isPaper" = true
            AND (${Prisma.join(wordBoundaryConditions, ' AND ')} OR ${Prisma.join(containsConditions, ' AND ')})
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${safeUpperAnyCondition(setList, 'si."setCode"')}
            ${printing.length > 0 ? Prisma.sql`AND (
              ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
              ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
              ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
            )` : Prisma.sql``}
            ${safeAnyCondition(rarity, 'mc.rarity')}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
        `
      ) as Array<{ count: number }>
      
      totalResults = Number(countResult[0]?.count || 0)
    } catch (error) {
      console.error('Error getting total count:', error)
      // Keep the fallback count
    }
  }

  const result: GroupedResult = {
    query: params.q || '',
    page,
    pageSize,
    totalResults,
    primary: items,
    otherNameMatches: [],
    broad: [],
    nextPageToken: hasMore ? String(page + 1) : null,
    facets,
  }

  // Cache the result
  cacheSetJSON(itemsKey, result, ttlSeconds).catch(() => {})
  
  const tEnd = Date.now()
  try { 
    console.log(JSON.stringify({ 
      event: 'search.perf', 
      q: params.q || '', 
      filters: { printing, sets: setList, rarity, groupId }, 
      timingsMs: { 
        total: tEnd - tStart, 
        db_items_ms: tBeforeFacets - tStart, 
        db_facets_ms: tAfterFacets - tBeforeFacets,
        cache_ms: 0, 
        serialize_ms: 0 
      }, 
      facets_count: {
        sets: facets.sets.length,
        rarity: facets.rarity.length,
        printing: facets.printing.length
      },
      ...(tEnd - tStart > 600 ? { warn: 'slow' } : {}) 
    })) 
  } catch {}

  return result
}

// Stage 1: Exact matches (for quoted queries)
async function searchExactMatchesGrouped({ qClean, groupId, setList, printing, rarity, page, pageSize, sort }: { qClean: string; groupId: string; setList: string[]; printing: string[]; rarity: string[]; page: number; pageSize: number; sort: SortOption }): Promise<any[]> {
  return await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        si.id, si."groupId", si.title, si."subtitle", si."imageNormalUrl", si."setCode",
        COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
        si."variantLabel", si."finishLabel", si."variantSuffix",
        COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS releasedAt,
        mc."priceUsd", mc."priceUsdFoil", mc."priceUsdEtched", mc.rarity,
            (CASE WHEN mc."priceUsd" IS NOT NULL THEN true ELSE false END) AS hasNonfoil,
            (CASE WHEN mc."priceUsdFoil" IS NOT NULL THEN true ELSE false END) AS hasFoil,
            (CASE WHEN mc."priceUsdEtched" IS NOT NULL THEN true ELSE false END) AS hasEtched,
        1000 AS score
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
      WHERE si.game = 'mtg' AND si."isPaper" = true
        AND unaccent(lower(si.title)) = ${qClean}
        ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
        ${safeUpperAnyCondition(setList, 'si."setCode"')}
        ${printing.length > 0 ? Prisma.sql`AND mc.finishes && ${printing}` : Prisma.sql``}
        ${safeAnyCondition(rarity, 'mc.rarity')}
      ORDER BY ${buildOrderByClause(sort)}
      LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
    `
  )
}

// Stage 2: Starts-With matches (AND logic between tokens)
async function searchStartsWithMatchesGrouped({ tokens, groupId, setList, printing, rarity, page, pageSize, sort }: { tokens: string[]; groupId: string; setList: string[]; printing: string[]; rarity: string[]; page: number; pageSize: number; sort: SortOption }): Promise<any[]> {
  // Use the same approach as the working suggestions search
  const qNorm = tokens.join(' ')
  const first = tokens[0] || ''
  
  return await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        si.id, si."groupId", si.title, si."subtitle", si."imageNormalUrl", si."setCode",
        COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
        si."variantLabel", si."finishLabel", si."variantSuffix",
        COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS releasedAt,
        mc."priceUsd", mc."priceUsdFoil", mc."priceUsdEtched", mc.rarity,
            (CASE WHEN mc."priceUsd" IS NOT NULL THEN true ELSE false END) AS hasNonfoil,
            (CASE WHEN mc."priceUsdFoil" IS NOT NULL THEN true ELSE false END) AS hasFoil,
            (CASE WHEN mc."priceUsdEtched" IS NOT NULL THEN true ELSE false END) AS hasEtched,
        -- Simple scoring similar to suggestions
        (CASE WHEN unaccent(lower(si.title)) = ${qNorm} THEN 1000 ELSE 0 END) +
        (CASE WHEN unaccent(lower(si.title)) LIKE ${qNorm + '%'} THEN 800 ELSE 0 END) +
        (CASE WHEN unaccent(lower(si.title)) ILIKE ${'%' + qNorm + '%'} THEN 600 ELSE 0 END) +
        (CASE WHEN unaccent(lower(si.title)) LIKE ${first + '%'} THEN 300 ELSE 0 END) +
        (CASE WHEN si.lang = 'en' THEN 1 ELSE 0 END) +
        (CASE WHEN si."isPaper" THEN 1 ELSE 0 END) AS score
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
      WHERE si.game = 'mtg' AND si."isPaper" = true
        AND (
          unaccent(lower(si.title)) LIKE ${qNorm + '%'}
          OR unaccent(lower(si.title)) LIKE ${first + '%'}
          OR unaccent(lower(si.title)) ILIKE ${'%' + qNorm + '%'}
        )
        ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
        ${safeUpperAnyCondition(setList, 'si."setCode"')}
      ORDER BY 
        ${buildOrderByClause(sort)}
      LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
    `
  )
}

// Stage 3: Contains matches (AND logic between tokens)
async function searchContainsMatchesGrouped({ tokens, groupId, setList, printing, rarity, page, pageSize, sort }: { tokens: string[]; groupId: string; setList: string[]; printing: string[]; rarity: string[]; page: number; pageSize: number; sort: SortOption }): Promise<any[]> {
  const containsConditions = tokens.map(token => 
    Prisma.sql`unaccent(lower(si.title)) ILIKE ${'%' + token + '%'}`
  )

  return await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        si.id, si."groupId", si.title, si."subtitle", si."imageNormalUrl", si."setCode",
        COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
        si."variantLabel", si."finishLabel", si."variantSuffix",
        COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS releasedAt,
        mc."priceUsd", mc."priceUsdFoil", mc."priceUsdEtched", mc.rarity,
            (CASE WHEN mc."priceUsd" IS NOT NULL THEN true ELSE false END) AS hasNonfoil,
            (CASE WHEN mc."priceUsdFoil" IS NOT NULL THEN true ELSE false END) AS hasFoil,
            (CASE WHEN mc."priceUsdEtched" IS NOT NULL THEN true ELSE false END) AS hasEtched,
        (${tokens.length * 50} + 
         CASE WHEN si.lang = 'en' THEN 1 ELSE 0 END +
         CASE WHEN si."isPaper" THEN 1 ELSE 0 END) AS score
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
      WHERE si.game = 'mtg' AND si."isPaper" = true
        AND (${Prisma.join(containsConditions, ' AND ')})
        ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
        ${safeUpperAnyCondition(setList, 'si."setCode"')}
        ${printing.length > 0 ? Prisma.sql`AND mc.finishes && ${printing}` : Prisma.sql``}
        ${safeAnyCondition(rarity, 'mc.rarity')}
      ORDER BY 
        ${buildOrderByClause(sort)}
      LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
    `
  )
}

// Stage 4: Light fuzzy matches (edit distance ≤1 per token)
async function searchFuzzyMatchesGrouped({ tokens, groupId, setList, printing, rarity, page, pageSize, sort }: { tokens: string[]; groupId: string; setList: string[]; printing: string[]; rarity: string[]; page: number; pageSize: number; sort: SortOption }): Promise<any[]> {
  const similarityConditions = tokens.map(token => 
    Prisma.sql`similarity(unaccent(lower(si.title)), ${token}) > 0.3`
  )

  return await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        si.id, si."groupId", si.title, si."subtitle", si."imageNormalUrl", si."setCode",
        COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
        si."variantLabel", si."finishLabel", si."variantSuffix",
        COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS releasedAt,
        mc."priceUsd", mc."priceUsdFoil", mc."priceUsdEtched", mc.rarity,
            (CASE WHEN mc."priceUsd" IS NOT NULL THEN true ELSE false END) AS hasNonfoil,
            (CASE WHEN mc."priceUsdFoil" IS NOT NULL THEN true ELSE false END) AS hasFoil,
            (CASE WHEN mc."priceUsdEtched" IS NOT NULL THEN true ELSE false END) AS hasEtched,
        (${tokens.length * 10} + 
         CASE WHEN si.lang = 'en' THEN 1 ELSE 0 END +
         CASE WHEN si."isPaper" THEN 1 ELSE 0 END) AS score
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
      WHERE si.game = 'mtg' AND si."isPaper" = true
        AND (${Prisma.join(similarityConditions, ' AND ')})
        ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
        ${safeUpperAnyCondition(setList, 'si."setCode"')}
        ${printing.length > 0 ? Prisma.sql`AND mc.finishes && ${printing}` : Prisma.sql``}
        ${safeAnyCondition(rarity, 'mc.rarity')}
      ORDER BY 
        ${buildOrderByClause(sort)}
      LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
    `
  )
}

// Get candidates for facet computation (up to 3000, not just paginated results)
async function getFacetCandidates({ queryTokens, groupId, setList, printing, rarity, showUnavailable }: { queryTokens: string[]; groupId: string; setList: string[]; printing: string[]; rarity: string[]; showUnavailable: boolean }): Promise<string[]> {
  if (queryTokens.length === 0) {
    return []
  }

  const wordBoundaryConditions = queryTokens.map(token => 
    Prisma.sql`unaccent(lower(si.title)) ~* ${'\\m' + token}`
  )
  
  const containsConditions = queryTokens.map(token => 
    Prisma.sql`unaccent(lower(si.title)) ~* ${token}`
  )

  const candidates = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT DISTINCT si.id
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      WHERE si.game = 'mtg' AND si."isPaper" = true
        AND (${Prisma.join(wordBoundaryConditions, ' AND ')} OR ${Prisma.join(containsConditions, ' AND ')})
        ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
        ${safeUpperAnyCondition(setList, 'si."setCode"')}
        ${printing.length > 0 ? Prisma.sql`AND (
          ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
          ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
          ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
        )` : Prisma.sql``}
        ${safeAnyCondition(rarity, 'mc.rarity')}
        ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
      LIMIT 3000
    `
  )

  // Ensure we always return a valid array with additional safety checks
  try {
    if (!Array.isArray(candidates)) {
      console.log(JSON.stringify({
        event: 'facets.debug.getFacetCandidates',
        warning: 'candidates_not_array',
        type: typeof candidates
      }))
      return []
    }
    
    const ids = candidates.map(row => {
      if (!row || typeof row.id !== 'string') {
        console.log(JSON.stringify({
          event: 'facets.debug.getFacetCandidates',
          warning: 'invalid_row_structure',
          row: row
        }))
        return null
      }
      return row.id
    }).filter(Boolean) as string[]
    
    console.log(JSON.stringify({
      event: 'facets.debug.getFacetCandidates',
      candidatesFound: ids.length,
      totalCandidates: candidates.length
    }))
    
    return ids
  } catch (error) {
    console.error('Error in getFacetCandidates:', error)
    return []
  }
}

// Build facets for the search results using optimized implementation
async function buildFacets({ queryTokens, groupId, setList, printing, rarity, facetsKey, showUnavailable, candidateIds, idType }: { queryTokens: string[]; groupId: string; setList: string[]; printing: string[]; rarity: string[]; facetsKey: string; showUnavailable: boolean; candidateIds?: string[]; idType?: 'printing_id' | 'scryfall_id' | 'card_id' | 'group_id' }): Promise<SearchFacets> {
  const t0 = Date.now()
  
  try {
    const facets = await buildFacetsOptimized({
      queryTokens,
      groupId,
      setList,
      printing,
      rarity,
      showUnavailable,
      candidateIds,
      idType
    })
    
    const t1 = Date.now()
    console.log(JSON.stringify({
      event: 'search.perf',
      db_facets_ms: t1 - t0,
      facets_count: {
        sets: facets.sets.length,
        rarity: facets.rarity.length,
        printing: facets.printing.length
      }
    }))
    
    return facets
  } catch (error) {
    console.error('Error building facets:', error)
    
    // Fallback to empty facets
    return {
      sets: [],
      rarity: [],
      printing: []
    }
  }
}

// Export the optimized version as the default groupedSearch function
// Can be controlled via SEARCH_OPTIMIZATION_ENABLED environment variable
const useOptimizedSearch = process.env.SEARCH_OPTIMIZATION_ENABLED !== 'false'

export const groupedSearch = useOptimizedSearch ? groupedSearchOptimized : groupedSearchOriginal
