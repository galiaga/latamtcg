import { prisma } from '@/lib/prisma'
import { cacheGetJSON, cacheSetJSON } from '@/lib/cache'
import type { SortOption } from '@/search/sort'
import { parseSortParam } from '@/search/sort'
import { Prisma } from '@prisma/client'
import type { SearchResult, SearchResultItem, SearchFacets } from '@/types/search'

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

export async function groupedSearch(params: GroupedParams): Promise<GroupedResult> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(25, Math.max(1, params.pageSize || 25))
  const sort = parseSortParam(params.sort || 'relevance')
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
    
    try {
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
            -- High score for starts-with matches
            (${queryTokens.length * 100} + 
             CASE WHEN si.lang = 'en' THEN 1 ELSE 0 END +
             CASE WHEN si."isPaper" THEN 1 ELSE 0 END) AS score
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
          WHERE si.game = 'mtg' AND si."isPaper" = true
            AND (${Prisma.join(wordBoundaryConditions, ' AND ')})
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
            ${printing.length > 0 ? Prisma.sql`AND (
              ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
              ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
              ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
            )` : Prisma.sql``}
            ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
          ORDER BY 
            ${sort === 'price_asc' ? Prisma.sql`GREATEST(COALESCE(mc."priceUsd", 0), COALESCE(mc."priceUsdFoil", 0), COALESCE(mc."priceUsdEtched", 0)) ASC NULLS LAST` : 
             sort === 'price_desc' ? Prisma.sql`GREATEST(COALESCE(mc."priceUsd", 0), COALESCE(mc."priceUsdFoil", 0), COALESCE(mc."priceUsdEtched", 0)) DESC NULLS LAST` :
             sort === 'release_desc' ? Prisma.sql`si."releasedAt" DESC NULLS LAST` :
             Prisma.sql`score DESC, si."releasedAt" DESC NULLS LAST`}
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
              ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
              ${printing.length > 0 ? Prisma.sql`AND (
              ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
              ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
              ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
            )` : Prisma.sql``}
              ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
            ORDER BY 
            ${sort === 'price_asc' ? Prisma.sql`GREATEST(COALESCE(mc."priceUsd", 0), COALESCE(mc."priceUsdFoil", 0), COALESCE(mc."priceUsdEtched", 0)) ASC NULLS LAST` : 
             sort === 'price_desc' ? Prisma.sql`GREATEST(COALESCE(mc."priceUsd", 0), COALESCE(mc."priceUsdFoil", 0), COALESCE(mc."priceUsdEtched", 0)) DESC NULLS LAST` :
             sort === 'release_desc' ? Prisma.sql`si."releasedAt" DESC NULLS LAST` :
             Prisma.sql`score DESC, si."releasedAt" DESC NULLS LAST`}
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

  // Build facets
  const facets = await buildFacets({ queryTokens, groupId, setList, printing: dbPrinting, rarity, facetsKey, showUnavailable })

  // Get accurate total count for pagination
  let totalResults = items.length + (hasMore ? 1 : 0) // Default fallback
  if (queryTokens.length > 0) {
    try {
      const wordBoundaryConditions = queryTokens.map(token =>
        Prisma.sql`unaccent(lower(si.title)) ~* ${'\\m' + token}`
      )
      
      const countResult = await prisma.$queryRaw(
        Prisma.sql`
          SELECT COUNT(*) as count
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          WHERE si.game = 'mtg' AND si."isPaper" = true
            AND (${Prisma.join(wordBoundaryConditions, ' AND ')})
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
            ${printing.length > 0 ? Prisma.sql`AND (
              ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
              ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
              ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
            )` : Prisma.sql``}
            ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
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
  try { console.log(JSON.stringify({ event: 'search.perf', q: params.q || '', filters: { printing, sets: setList, rarity, groupId }, timingsMs: { total: tEnd - tStart, db_items_ms: tAfterItems - tStart, db_facets_ms: tEnd - tAfterItems, cache_ms: 0, serialize_ms: 0 }, ...(tEnd - tStart > 600 ? { warn: 'slow' } : {}) })) } catch {}

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
        ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
        ${printing.length > 0 ? Prisma.sql`AND mc.finishes && ${printing}` : Prisma.sql``}
        ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
      ORDER BY 
        ${sort === 'price_asc' ? Prisma.sql`GREATEST(COALESCE(mc."priceUsd", 0), COALESCE(mc."priceUsdFoil", 0), COALESCE(mc."priceUsdEtched", 0)) ASC NULLS LAST` : 
         sort === 'price_desc' ? Prisma.sql`GREATEST(COALESCE(mc."priceUsd", 0), COALESCE(mc."priceUsdFoil", 0), COALESCE(mc."priceUsdEtched", 0)) DESC NULLS LAST` :
         sort === 'release_desc' ? Prisma.sql`si."releasedAt" DESC NULLS LAST` :
         Prisma.sql`si."releasedAt" DESC NULLS LAST`}
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
        ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
      ORDER BY score DESC, si."releasedAt" DESC NULLS LAST
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
        ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
        ${printing.length > 0 ? Prisma.sql`AND mc.finishes && ${printing}` : Prisma.sql``}
        ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
      ORDER BY score DESC, si."releasedAt" DESC NULLS LAST
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
        ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
        ${printing.length > 0 ? Prisma.sql`AND mc.finishes && ${printing}` : Prisma.sql``}
        ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
      ORDER BY score DESC, si."releasedAt" DESC NULLS LAST
      LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
    `
  )
}

// Build facets for the search results
async function buildFacets({ queryTokens, groupId, setList, printing, rarity, facetsKey, showUnavailable }: { queryTokens: string[]; groupId: string; setList: string[]; printing: string[]; rarity: string[]; facetsKey: string; showUnavailable: boolean }): Promise<SearchFacets> {
  try {
    const cached = await cacheGetJSON<SearchFacets>(facetsKey)
    if (cached) return cached
  } catch {}

  // Build facets based on the search results
  const facets: SearchFacets = {
    sets: [],
    rarity: [],
    printing: []
  }

  if (queryTokens.length > 0) {
    try {
      // Build sets facet
      const setsQuery = queryTokens.map(token =>
        Prisma.sql`unaccent(lower(si.title)) ILIKE ${'%' + token + '%'}`
      )

      const setsResults = await prisma.$queryRaw(
        Prisma.sql`
          SELECT 
            si."setCode",
            COALESCE(si."setName", s.set_name) AS "setName",
            COUNT(*) as count
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
          WHERE si.game = 'mtg' AND si."isPaper" = true
            AND (${Prisma.join(setsQuery, ' AND ')})
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${printing.length > 0 ? Prisma.sql`AND (
              ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
              ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
              ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
            )` : Prisma.sql``}
            ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
          GROUP BY si."setCode", si."setName", s.set_name
          ORDER BY count DESC
          LIMIT 20
        `
      ) as Array<{ setCode: string; setName: string; count: number }>

      facets.sets = setsResults.map(row => ({
        code: row.setCode,
        name: row.setName || row.setCode,
        count: Number(row.count)
      }))

      // Build rarity facet
      const rarityResults = await prisma.$queryRaw(
        Prisma.sql`
          SELECT 
            mc.rarity,
            COUNT(*) as count
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          WHERE si.game = 'mtg' AND si."isPaper" = true
            AND (${Prisma.join(setsQuery, ' AND ')})
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
            ${printing.length > 0 ? Prisma.sql`AND (
              ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
              ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
              ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
            )` : Prisma.sql``}
          GROUP BY mc.rarity
          ORDER BY count DESC
        `
      ) as Array<{ rarity: string; count: number }>

      facets.rarity = rarityResults.map(row => ({
        key: row.rarity,
        count: Number(row.count)
      }))

      // Build printing facet based on price availability
      const printingFacets = []
      
      // Count nonfoil (normal) availability
      const nonfoilCount = await prisma.$queryRaw(
        Prisma.sql`
          SELECT COUNT(*) as count
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          WHERE si.game = 'mtg' AND si."isPaper" = true
            AND (${Prisma.join(setsQuery, ' AND ')})
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
            ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
            AND mc."priceUsd" IS NOT NULL
        `
      ) as Array<{ count: number }>
      
      if (nonfoilCount[0]?.count > 0) {
        printingFacets.push({ key: 'normal', count: Number(nonfoilCount[0].count) })
      }
      
      // Count foil availability
      const foilCount = await prisma.$queryRaw(
        Prisma.sql`
          SELECT COUNT(*) as count
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          WHERE si.game = 'mtg' AND si."isPaper" = true
            AND (${Prisma.join(setsQuery, ' AND ')})
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
            ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
            AND mc."priceUsdFoil" IS NOT NULL
        `
      ) as Array<{ count: number }>
      
      if (foilCount[0]?.count > 0) {
        printingFacets.push({ key: 'foil', count: Number(foilCount[0].count) })
      }
      
      // Count etched availability
      const etchedCount = await prisma.$queryRaw(
        Prisma.sql`
          SELECT COUNT(*) as count
          FROM "public"."SearchIndex" si
          JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
          WHERE si.game = 'mtg' AND si."isPaper" = true
            AND (${Prisma.join(setsQuery, ' AND ')})
            ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
            ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
            ${rarity.length > 0 ? Prisma.sql`AND mc.rarity = ANY(${rarity})` : Prisma.sql``}
            ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
            AND mc."priceUsdEtched" IS NOT NULL
        `
      ) as Array<{ count: number }>
      
      if (etchedCount[0]?.count > 0) {
        printingFacets.push({ key: 'etched', count: Number(etchedCount[0].count) })
      }
      
      facets.printing = printingFacets

    } catch (error) {
      console.error('Error building facets:', error)
    }
  }

  cacheSetJSON(facetsKey, facets, 300).catch(() => {})
  return facets
}
