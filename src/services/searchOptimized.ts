// Optimized search query implementation
// Reduces database queries and improves performance for complex searches

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

export interface OptimizedSearchParams {
  queryTokens: string[]
  groupId?: string
  setList: string[]
  printing: string[]
  rarity: string[]
  showUnavailable: boolean
  page: number
  pageSize: number
  sort: 'relevance' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'release_desc'
}

export interface OptimizedSearchResult {
  items: any[]
  totalResults: number
  hasMore: boolean
  candidateIds: string[]
}

// Build optimized ORDER BY clause
function buildOptimizedOrderByClause(sort: string, printing: string[] = []): Prisma.Sql {
  switch (sort) {
    case 'name_asc':
      return Prisma.sql`title ASC NULLS LAST`
    case 'name_desc':
      return Prisma.sql`title DESC NULLS LAST`
    case 'price_asc':
      return Prisma.sql`COALESCE("priceUsd", "priceUsdFoil", "priceUsdEtched") ASC NULLS LAST, releasedAt DESC NULLS LAST`
    case 'price_desc':
      return Prisma.sql`COALESCE("priceUsd", "priceUsdFoil", "priceUsdEtched") DESC NULLS LAST, releasedAt DESC NULLS LAST`
    case 'release_desc':
      return Prisma.sql`releasedAt DESC NULLS LAST`
    case 'relevance':
    default:
      return Prisma.sql`score DESC, releasedAt DESC NULLS LAST`
  }
}

// Single optimized query that combines all search stages
export async function optimizedSearch(params: OptimizedSearchParams): Promise<OptimizedSearchResult> {
  const { queryTokens, groupId, setList, printing, rarity, showUnavailable, page, pageSize, sort } = params
  
  // Map frontend printing values to database values
  const mapPrintingToDb = (printing: string[]): string[] => {
    return printing.map(p => p === 'normal' ? 'nonfoil' : p)
  }
  
  const dbPrinting = mapPrintingToDb(printing)
  
  // Build search conditions using a single optimized query
  // This combines word boundary, contains, and fuzzy matching in one query
  const searchConditions = queryTokens.length > 0 ? Prisma.sql`
    AND (
      -- Word boundary matches (highest priority)
      ${Prisma.join(queryTokens.map(token => 
        Prisma.sql`unaccent(lower(si.title)) ~* ${'\\m' + token}`
      ), ' AND ')}
      OR
      -- Contains matches (medium priority)  
      ${Prisma.join(queryTokens.map(token => 
        Prisma.sql`unaccent(lower(si.title)) ILIKE ${'%' + token + '%'}`
      ), ' AND ')}
      OR
      -- Light fuzzy matches (lowest priority)
      ${Prisma.join(queryTokens.map(token => 
        Prisma.sql`similarity(unaccent(lower(si.title)), ${token}) > 0.3`
      ), ' AND ')}
    )
  ` : Prisma.sql``

  // Build scoring based on match type
  const scoreExpression = queryTokens.length > 0 ? Prisma.sql`
    CASE 
      -- Word boundary matches get highest score
      WHEN ${Prisma.join(queryTokens.map(token => 
        Prisma.sql`unaccent(lower(si.title)) ~* ${'\\m' + token}`
      ), ' AND ')} THEN ${queryTokens.length * 1000}
      -- Contains matches get medium score
      WHEN ${Prisma.join(queryTokens.map(token => 
        Prisma.sql`unaccent(lower(si.title)) ILIKE ${'%' + token + '%'}`
      ), ' AND ')} THEN ${queryTokens.length * 100}
      -- Fuzzy matches get lowest score
      ELSE ${queryTokens.length * 10}
    END +
    CASE WHEN si.lang = 'en' THEN 10 ELSE 0 END +
    CASE WHEN si."isPaper" THEN 5 ELSE 0 END
  ` : Prisma.sql`1000`

  // Add EXPLAIN analysis if enabled
  if (process.env.EXPLAIN_OPTIMIZED_SEARCH === '1') {
    const explainResult = await prisma.$queryRaw<Array<{query_plan: string}>>(
      Prisma.sql`
        EXPLAIN (ANALYZE, BUFFERS)
        WITH search_results AS (
          SELECT
            si.id, si."groupId", si.title, si."subtitle", si."imageNormalUrl", si."setCode",
            COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
            si."variantLabel", si."finishLabel", si."variantSuffix",
            COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS releasedAt,
            mc."priceUsd", mc."priceUsdFoil", mc."priceUsdEtched", mc."computedPriceClp", mc.rarity,
            (CASE WHEN mc."priceUsd" IS NOT NULL THEN true ELSE false END) AS hasNonfoil,
            (CASE WHEN mc."priceUsdFoil" IS NOT NULL THEN true ELSE false END) AS hasFoil,
            (CASE WHEN mc."priceUsdEtched" IS NOT NULL THEN true ELSE false END) AS hasEtched,
            ${scoreExpression} AS score,
            COUNT(*) OVER() AS total_count
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
          WHERE si.game = 'mtg' AND si."isPaper" = true
            ${searchConditions}
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${safeUpperAnyCondition(setList, 'si."setCode"')}
            ${printing.length > 0 ? Prisma.sql`AND (
              ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
              ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
              ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
            )` : Prisma.sql``}
            ${safeAnyCondition(rarity, 'mc.rarity')}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
        ),
        paginated_results AS (
          SELECT 
            id, "groupId", title, subtitle, "imageNormalUrl", "setCode",
            "setName", "collectorNumber", "variantLabel", "finishLabel", "variantSuffix",
            releasedAt, "priceUsd", "priceUsdFoil", "priceUsdEtched", rarity,
            hasNonfoil, hasFoil, hasEtched, score, total_count,
            ROW_NUMBER() OVER(ORDER BY ${buildOptimizedOrderByClause(sort, printing)}) AS row_number
          FROM search_results
        )
        SELECT 
          id, "groupId", title, subtitle, "imageNormalUrl", "setCode",
          "setName", "collectorNumber", "variantLabel", "finishLabel", "variantSuffix",
          releasedAt, "priceUsd", "priceUsdFoil", "priceUsdEtched", rarity,
          hasNonfoil, hasFoil, hasEtched, score, total_count, row_number
        FROM paginated_results
        WHERE row_number BETWEEN ${(page - 1) * pageSize + 1} AND ${page * pageSize + 1}
        ORDER BY ${buildOptimizedOrderByClause(sort, printing)}
      `
    )
    
    // Log EXPLAIN in chunks
    const explainText = explainResult.map(r => r.query_plan).join('\n')
    const lines = explainText.split('\n')
    for (let i = 0; i < lines.length; i += 2) {
      const chunk = lines.slice(i, i + 2).join('\n')
      console.log(JSON.stringify({
        event: 'optimized_search.explain',
        line: i + 1,
        text: chunk
      }))
    }
  }

  // Single optimized query that gets both items and total count
  const result = await prisma.$queryRaw<Array<{
    id: string
    groupId: string
    title: string
    subtitle: string
    imageNormalUrl: string
    setCode: string
    setName: string
    collectorNumber: string
    variantLabel: string
    finishLabel: string
    variantSuffix: string
    releasedAt: number
    priceUsd: number
    priceUsdFoil: number
    priceUsdEtched: number
    computedPriceClp: number | null
    rarity: string
    hasNonfoil: boolean
    hasFoil: boolean
    hasEtched: boolean
    score: number
    total_count: bigint
    row_number: bigint
  }>>(
    Prisma.sql`
      WITH search_results AS (
        SELECT
          si.id, si."groupId", si.title, si."subtitle", si."imageNormalUrl", si."setCode",
          COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
          si."variantLabel", si."finishLabel", si."variantSuffix",
          COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS releasedAt,
          mc."priceUsd", mc."priceUsdFoil", mc."priceUsdEtched", mc."computedPriceClp", mc.rarity,
          (CASE WHEN mc."priceUsd" IS NOT NULL THEN true ELSE false END) AS hasNonfoil,
          (CASE WHEN mc."priceUsdFoil" IS NOT NULL THEN true ELSE false END) AS hasFoil,
          (CASE WHEN mc."priceUsdEtched" IS NOT NULL THEN true ELSE false END) AS hasEtched,
          ${scoreExpression} AS score,
          COUNT(*) OVER() AS total_count
        FROM "public"."SearchIndex" si
        JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
        LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
        WHERE si.game = 'mtg' AND si."isPaper" = true
          ${searchConditions}
          ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
          ${safeUpperAnyCondition(setList, 'si."setCode"')}
          ${printing.length > 0 ? Prisma.sql`AND (
            ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
            ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
            ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
          )` : Prisma.sql``}
          ${safeAnyCondition(rarity, 'mc.rarity')}
          ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
      ),
      paginated_results AS (
        SELECT 
          id, "groupId", title, subtitle, "imageNormalUrl", "setCode",
          "setName", "collectorNumber", "variantLabel", "finishLabel", "variantSuffix",
          releasedAt, "priceUsd", "priceUsdFoil", "priceUsdEtched", rarity,
          hasNonfoil, hasFoil, hasEtched, score, total_count,
          ROW_NUMBER() OVER(ORDER BY ${buildOptimizedOrderByClause(sort, printing)}) AS row_number
        FROM search_results
      )
      SELECT 
        id, "groupId", title, subtitle, "imageNormalUrl", "setCode",
        "setName", "collectorNumber", "variantLabel", "finishLabel", "variantSuffix",
        releasedAt, "priceUsd", "priceUsdFoil", "priceUsdEtched", rarity,
        hasNonfoil, hasFoil, hasEtched, score, total_count, row_number
      FROM paginated_results
      WHERE row_number BETWEEN ${(page - 1) * pageSize + 1} AND ${page * pageSize + 1}
      ORDER BY ${buildOptimizedOrderByClause(sort, printing)}
    `
  )

  // Get all candidate IDs for facets computation (not just paginated results)
  const allCandidatesResult = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT si.id
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      WHERE si.game = 'mtg' AND si."isPaper" = true
        ${searchConditions}
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

  // Extract results and convert Decimal objects to numbers
  const items = result.slice(0, pageSize).map(item => ({
    ...item,
    priceUsd: item.priceUsd ? Number(item.priceUsd) : null,
    priceUsdFoil: item.priceUsdFoil ? Number(item.priceUsdFoil) : null,
    priceUsdEtched: item.priceUsdEtched ? Number(item.priceUsdEtched) : null,
  }))
  const hasMore = result.length > pageSize
  const totalResults = result.length > 0 ? Number(result[0].total_count) : 0
  const candidateIds = allCandidatesResult.map(r => r.id)

  return {
    items,
    totalResults,
    hasMore,
    candidateIds
  }
}

// Optimized facets computation using pre-computed candidate IDs
export async function optimizedFacets(candidateIds: string[]): Promise<{
  sets: Array<{ code: string; name: string; count: number }>
  rarity: Array<{ key: string; count: number }>
  printing: Array<{ key: string; count: number }>
}> {
  if (candidateIds.length === 0) {
    return { sets: [], rarity: [], printing: [] }
  }

  // Single query to compute all facets from candidate IDs
  const facets = await prisma.$queryRaw<Array<{
    facet_type: string
    facet_key: string
    facet_name: string
    count: bigint
  }>>(
    Prisma.sql`
      WITH candidates AS (
        SELECT unnest(${candidateIds}) AS scryfall_id
      ),
      facet_data AS (
        SELECT 
          'sets' as facet_type,
          mc."setCode" as facet_key,
          COALESCE(s.set_name, mc."setCode") as facet_name,
          COUNT(*) as count
        FROM candidates c
        JOIN "MtgCard" mc ON mc."scryfallId" = c.scryfall_id
        LEFT JOIN "Set" s ON upper(s.set_code) = upper(mc."setCode")
        GROUP BY mc."setCode", s.set_name
        
        UNION ALL
        
        SELECT 
          'rarity' as facet_type,
          mc.rarity as facet_key,
          mc.rarity as facet_name,
          COUNT(*) as count
        FROM candidates c
        JOIN "MtgCard" mc ON mc."scryfallId" = c.scryfall_id
        WHERE mc.rarity IS NOT NULL
        GROUP BY mc.rarity
        
        UNION ALL
        
        SELECT 
          'printing' as facet_type,
          finish as facet_key,
          CASE 
            WHEN finish = 'nonfoil' THEN 'normal'
            ELSE finish
          END as facet_name,
          COUNT(*) as count
        FROM candidates c
        JOIN "MtgCard" mc ON mc."scryfallId" = c.scryfall_id
        CROSS JOIN LATERAL unnest(mc.finishes) as finish
        GROUP BY finish
      )
      SELECT facet_type, facet_key, facet_name, count
      FROM facet_data
      ORDER BY facet_type, count DESC, facet_key
    `
  )

  // Group facets by type
  const sets = facets.filter(f => f.facet_type === 'sets').map(f => ({
    code: f.facet_key,
    name: f.facet_name,
    count: Number(f.count)
  }))

  const rarityFacets = facets.filter(f => f.facet_type === 'rarity').map(f => ({
    key: f.facet_key,
    count: Number(f.count)
  }))

  const printingFacets = facets.filter(f => f.facet_type === 'printing').map(f => ({
    key: f.facet_name,
    count: Number(f.count)
  }))

  return {
    sets,
    rarity: rarityFacets,
    printing: printingFacets
  }
}
