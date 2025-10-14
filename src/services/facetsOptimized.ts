// Optimized facets computation for search performance
// Implements candidate-based aggregation with single query and SWR caching

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { cache } from '@/lib/cache'
import { buildCacheKey } from '@/lib/cache'

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

export interface SearchFacets {
  sets: Array<{ code: string; name: string; count: number }>
  rarity: Array<{ key: string; count: number }>
  printing: Array<{ key: string; count: number }>
}

export interface FacetCandidate {
  id: string
  setCode: string
  rarity: string
  finishes: string[]
}

export interface FacetParams {
  queryTokens: string[]
  groupId?: string
  setList: string[]
  printing: string[]
  rarity: string[]
  showUnavailable: boolean
  candidateIds?: string[]
  idType?: 'printing_id' | 'scryfall_id' | 'card_id' | 'group_id'
}

// Environment configuration for facets
const FACETS_TTL_FRESH = parseInt(process.env.FACETS_TTL_FRESH || '180', 10)
const FACETS_TTL_STALE = parseInt(process.env.FACETS_TTL_STALE || '5', 10)
const FACETS_WORK_MEM = process.env.FACETS_WORK_MEM || '64MB'
const FACETS_LIMIT = process.env.FACETS_LIMIT ? parseInt(process.env.FACETS_LIMIT, 10) : undefined
const EXPLAIN_FACETS = process.env.EXPLAIN_FACETS === '1'

// Build facet-specific cache key (excludes sort, page, limit)
export function buildFacetCacheKey(params: {
  q: string
  mode: string
  printing: string[]
  sets: string[]
  rarity: string[]
  groupId?: string
  showUnavailable: boolean
}): string {
  return buildCacheKey({
    kind: 'facets',
    q: params.q,
    mode: params.mode,
    printing: params.printing,
    sets: params.sets,
    rarity: params.rarity,
    groupId: params.groupId,
    showUnavailable: params.showUnavailable
  })
}

// Get candidates for facet computation
async function getCandidates(params: FacetParams): Promise<FacetCandidate[]> {
  const { queryTokens, groupId, setList, printing, rarity, showUnavailable, candidateIds } = params

  // If we have pre-computed candidate IDs, use them directly
  if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
    console.log(JSON.stringify({
      event: 'facets.debug.candidates',
      source: 'precomputed_ids',
      candidateIdsCount: candidateIds.length,
      paramType: 'text[]',
      columnType: 'scryfallId'
    }))
    
    // Double-check that candidateIds is a valid array before using in SQL
    const validCandidateIds = Array.isArray(candidateIds) ? candidateIds : []
    
    if (validCandidateIds.length === 0) {
      console.log(JSON.stringify({
        event: 'facets.debug.candidates',
        source: 'precomputed_ids',
        warning: 'empty_candidate_ids',
        originalLength: candidateIds?.length || 0
      }))
      return []
    }

    const candidates = await prisma.$queryRaw<FacetCandidate[]>(
      Prisma.sql`
        SELECT 
          mc.id,
          mc."setCode" as "setCode",
          mc.rarity,
          mc.finishes
        FROM "MtgCard" mc
        WHERE mc."scryfallId" = ANY(${validCandidateIds}::text[])
          AND mc."isPaper" = true
      `
    )
    
    console.log(JSON.stringify({
      event: 'facets.debug.candidates',
      source: 'precomputed_ids',
      foundCandidates: candidates.length,
      matched: candidates.length > 0
    }))
    return candidates
  }

  // Otherwise, compute candidates from search tokens
  if (queryTokens.length === 0) {
    return []
  }

  const setsQuery = queryTokens.map(token =>
    Prisma.sql`unaccent(lower(si.title)) ILIKE ${'%' + token + '%'}`
  )

  console.log(JSON.stringify({
    event: 'facets.debug.candidates',
    source: 'token_based',
    queryTokens: queryTokens.length,
    tokens: queryTokens
  }))

  const candidates = await prisma.$queryRaw<FacetCandidate[]>(
    Prisma.sql`
      SELECT DISTINCT
        mc.id,
        mc."setCode" as "setCode",
        mc.rarity,
        mc.finishes
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      WHERE si.game = 'mtg' AND si."isPaper" = true
        AND (${Prisma.join(setsQuery, ' AND ')})
        ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
        ${safeUpperAnyCondition(setList, 'si."setCode"')}
        ${printing.length > 0 ? Prisma.sql`AND (
          ${printing.includes('normal') ? Prisma.sql`mc."priceUsd" IS NOT NULL` : Prisma.sql`false`}
          ${printing.includes('foil') ? Prisma.sql`OR mc."priceUsdFoil" IS NOT NULL` : Prisma.sql``}
          ${printing.includes('etched') ? Prisma.sql`OR mc."priceUsdEtched" IS NOT NULL` : Prisma.sql``}
        )` : Prisma.sql``}
        ${safeAnyCondition(rarity, 'mc.rarity')}
        ${showUnavailable ? Prisma.sql`` : Prisma.sql`AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)`}
    `
  )

  console.log(JSON.stringify({
    event: 'facets.debug.candidates',
    source: 'token_based',
    foundCandidates: candidates.length
  }))

  return candidates
}

// Single query facet aggregation using GROUPING SETS
async function computeFacetsFromCandidates(candidates: FacetCandidate[], idType: 'printing_id' | 'scryfall_id' | 'card_id' | 'group_id' = 'printing_id'): Promise<SearchFacets> {
  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    console.log(JSON.stringify({
      event: 'facets.debug.computation',
      candidatesLength: candidates?.length || 0,
      isEmpty: true,
      reason: 'no_candidates'
    }))
    return {
      sets: [],
      rarity: [],
      printing: []
    }
  }

  const candidateIds = candidates.map(c => c.id).filter(Boolean)

  // Ensure we have valid candidate IDs
  if (candidateIds.length === 0) {
    console.log(JSON.stringify({
      event: 'facets.debug.computation',
      candidatesLength: candidates.length,
      candidateIdsLength: candidateIds.length,
      isEmpty: true,
      reason: 'no_valid_candidates'
    }))
    return {
      sets: [],
      rarity: [],
      printing: []
    }
  }

  // Map idType to column and cast information
  const idTypeMap = {
    'scryfall_id': { column: 'mc."scryfallId"', cast: 'text[]' },
    'printing_id': { column: 'mc.id', cast: 'text[]' },
    'card_id': { column: 'mc."cardId"', cast: 'text[]' },
    'group_id': { column: 'mc."groupId"', cast: 'text[]' }
  }

  const typeInfo = idTypeMap[idType] || idTypeMap['printing_id']
  
  // Build idsArr with correct cast based on column type
  const idsArr = Prisma.sql`ARRAY[${Prisma.join(candidateIds)}]::${Prisma.raw(typeInfo.cast)}`

  // Debug logging for join type
  console.log(JSON.stringify({
    event: 'facets.debug.join',
    idType,
    compareColumn: typeInfo.column,
    cast: typeInfo.cast,
    candidates: candidateIds.length
  }))

  // Check for required indexes and finishes type
  const indexHints = await prisma.$queryRaw<Array<{indexname: string}>>(
    Prisma.sql`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'MtgCard' 
      AND (indexname LIKE '%scryfall%' OR indexname LIKE '%set%' OR indexname LIKE '%rarity%' OR indexname LIKE '%finishes%')
    `
  )
  
  const finishesType = await prisma.$queryRaw<Array<{pg_typeof: string}>>(
    Prisma.sql`SELECT pg_typeof(finishes)::text FROM "MtgCard" LIMIT 1`
  )
  
  console.log(JSON.stringify({
    event: 'facets.index.hints',
    hasIdxScryfallId: indexHints.some(idx => idx.indexname.includes('scryfall')),
    hasIdxSet: indexHints.some(idx => idx.indexname.includes('set')),
    hasIdxRarity: indexHints.some(idx => idx.indexname.includes('rarity')),
    hasIdxFinishes: indexHints.some(idx => idx.indexname.includes('finishes')),
    finishesType: finishesType[0]?.pg_typeof || 'unknown',
    totalIndexes: indexHints.length
  }))

  // Use work_mem bump for facet computation
  const facets = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.raw(`SET LOCAL work_mem = '${FACETS_WORK_MEM}'`))

    // Add targeted self-check right before the main facets aggregation
    const joinCheck = await tx.$queryRaw<Array<{matched: bigint}>>(
      Prisma.sql`
        SELECT COUNT(DISTINCT ${Prisma.raw(typeInfo.column)}) AS matched 
        FROM "MtgCard" mc 
        JOIN (SELECT unnest(${idsArr}) AS id) ids ON ${Prisma.raw(typeInfo.column)} = ids.id
      `
    )
    
    const matched = Number(joinCheck[0]?.matched || 0)
    
    // Log join check results
    console.log(JSON.stringify({
      event: 'facets.debug.joinCheck',
      incoming: candidateIds.length,
      matched,
      idType,
      compareColumn: typeInfo.column
    }))
    
    // If no matches, short-circuit immediately
    if (matched === 0) {
      console.log(JSON.stringify({
        event: 'facets.shortCircuit',
        reason: 'no-match',
        incoming: candidateIds.length,
        matched: 0
      }))
      
      // Add sample probe for debugging
      const sampleIds = candidateIds.slice(0, 3)
      const probeResults = await Promise.all(
        sampleIds.map(async (id) => {
          const probe = await tx.$queryRaw<Array<{found: bigint}>>(
            Prisma.sql`
              SELECT COUNT(*) AS found 
              FROM "MtgCard" mc 
              WHERE ${Prisma.raw(typeInfo.column)} = ${id}
            `
          )
          return { id, found: Number(probe[0]?.found || 0) > 0 }
        })
      )
      
      console.log(JSON.stringify({
        event: 'facets.debug.probe',
        sample: probeResults
      }))
      
      return {
        sets: [],
        rarity: [],
        printing: []
      }
    }
    
    // Check for partial mismatch if strict mode enabled
    if (process.env.FACETS_STRICT_IDS === '1' && matched < candidateIds.length) {
      console.log(JSON.stringify({
        event: 'facets.debug.partialMismatch',
        incoming: candidateIds.length,
        matched
      }))
    }

    if (EXPLAIN_FACETS) {
      console.log('EXPLAIN FACETS QUERY:')
      const explainResult = await tx.$queryRaw<Array<{query_plan: string}>>(
        Prisma.sql`
          EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
          WITH ids AS (
            SELECT unnest(${idsArr}) AS id
          ),
          candidates AS (
            SELECT mc.id,
                   mc."setCode" AS set_code,
                   mc.rarity AS rarity,
                   mc.finishes AS finishes
            FROM "MtgCard" mc
            JOIN ids ON ${Prisma.raw(typeInfo.column)} = ids.id
          ),
          cand_finishes AS (
            SELECT set_code, rarity, unnest(finishes) AS finish
            FROM candidates
          ),
          set_names AS (
            SELECT DISTINCT s.set_code, s.set_name
            FROM "Set" s
            WHERE s.set_code IN (SELECT DISTINCT set_code FROM candidates)
          )
          SELECT * FROM (
            SELECT 'sets' AS facet_type, c.set_code AS facet_key,
                   COALESCE(sn.set_name, c.set_code) AS facet_name,
                   COUNT(*) AS count
            FROM candidates c LEFT JOIN set_names sn USING (set_code)
            GROUP BY c.set_code, sn.set_name
            UNION ALL
            SELECT 'rarity', c.rarity, NULL, COUNT(*)
            FROM candidates c WHERE c.rarity IS NOT NULL
            GROUP BY c.rarity
            UNION ALL
            SELECT 'printing', cf.finish, NULL, COUNT(*)
            FROM cand_finishes cf
            GROUP BY cf.finish
          ) facets
        `
      )
      // Log EXPLAIN in chunks of 2-3 lines
      const explainText = explainResult.map(r => r.query_plan).join('\n')
      const lines = explainText.split('\n')
      for (let i = 0; i < lines.length; i += 2) {
        const chunk = lines.slice(i, i + 2).join('\n')
        console.log(JSON.stringify({
          event: 'facets.explain',
          line: i + 1,
          text: chunk
        }))
      }
    }

    // Strengthened sanity check with sample data and type detection
    let sanityCheck
    try {
      sanityCheck = await tx.$queryRaw<Array<{
        sanity: any
      }>>(
        Prisma.sql`
          WITH ids AS (
            SELECT unnest(${idsArr}) AS id
          ),
          candidates AS (
            SELECT mc.id,
                   mc."setCode" AS set_code,
                   mc.rarity AS rarity,
                   mc.finishes AS finishes
            FROM "MtgCard" mc
            JOIN ids ON ${Prisma.raw(typeInfo.column)} = ids.id
          ),
          cand_finishes AS (
            SELECT set_code, rarity, unnest(finishes) AS finish
            FROM candidates
          )
          SELECT jsonb_build_object(
            'candidates', (SELECT COUNT(*) FROM candidates),
            'cand_sample', (SELECT jsonb_build_object(
              'id', id,
              'set_code', set_code,
              'rarity', rarity,
              'finishes', finishes
            ) FROM candidates LIMIT 1),
            'cand_finishes', (SELECT COUNT(*) FROM cand_finishes),
            'setsBuckets', (SELECT COUNT(*) FROM (SELECT set_code, COUNT(*) FROM candidates GROUP BY 1) x),
            'rarityBuckets', (SELECT COUNT(*) FROM (SELECT rarity, COUNT(*) FROM candidates GROUP BY 1) x),
            'printingBuckets', (SELECT COUNT(*) FROM (SELECT finish, COUNT(*) FROM cand_finishes GROUP BY 1) x),
            'finishesType', (SELECT pg_typeof(finishes)::text FROM candidates LIMIT 1)
          ) AS sanity
        `
      )
    } catch (error) {
      console.log(JSON.stringify({
        event: 'facets.debug.sql_error',
        phase: 'sanity_check',
        hint: 'check IN () subqueries are single-column',
        sqlPart: 'sanity check with cand_sample',
        error: error instanceof Error ? error.message : String(error)
      }))
      throw error
    }

    // Log sanity check results
    if (sanityCheck.length > 0) {
      const sanity = sanityCheck[0].sanity
      console.log(JSON.stringify({
        event: 'facets.debug.sanity',
        data: sanity
      }))
    }

    const result = await tx.$queryRaw<Array<{
      facet_type: string
      facet_key: string
      facet_name: string | null
      count: number
    }>>(
      Prisma.sql`
        WITH ids AS (
          SELECT unnest(${idsArr}) AS id
        ),
        candidates AS (
          SELECT mc.id,
                 mc."setCode" AS set_code,
                 mc.rarity AS rarity,
                 mc.finishes AS finishes
          FROM "MtgCard" mc
          JOIN ids ON ${Prisma.raw(typeInfo.column)} = ids.id
        ),
        cand_finishes AS (
          SELECT set_code, rarity, unnest(finishes) AS finish
          FROM candidates
        ),
        set_names AS (
          SELECT DISTINCT s.set_code, s.set_name
          FROM "Set" s
          WHERE s.set_code IN (SELECT DISTINCT set_code FROM candidates)
        ),
        facet_data AS (
          SELECT 
            'sets' as facet_type,
            c.set_code as facet_key,
            COALESCE(sn.set_name, c.set_code) as facet_name,
            COUNT(*) as count
          FROM candidates c
          LEFT JOIN set_names sn ON sn.set_code = c.set_code
          GROUP BY c.set_code, sn.set_name
          
          UNION ALL
          
          SELECT 
            'rarity' as facet_type,
            c.rarity as facet_key,
            NULL as facet_name,
            COUNT(*) as count
          FROM candidates c
          WHERE c.rarity IS NOT NULL
          GROUP BY c.rarity
          
          UNION ALL
          
          SELECT 
            'printing' as facet_type,
            cf.finish as facet_key,
            NULL as facet_name,
            COUNT(*) as count
          FROM cand_finishes cf
          GROUP BY cf.finish
        )
        SELECT facet_type, facet_key, facet_name, count
        FROM facet_data
        WHERE count > 0
        ORDER BY facet_type, count DESC, facet_key
      `
    )

    if (EXPLAIN_FACETS) {
      console.log('FACETS QUERY COMPLETED')
    }

    // Process results into facet structure
    const facets: SearchFacets = {
      sets: [],
      rarity: [],
      printing: []
    }

    for (const row of result) {
      const count = Number(row.count)
      
      switch (row.facet_type) {
        case 'sets':
          facets.sets.push({
            code: row.facet_key,
            name: row.facet_name || row.facet_key,
            count
          })
          break
        case 'rarity':
          facets.rarity.push({
            key: row.facet_key,
            count
          })
          break
        case 'printing':
          facets.printing.push({
            key: row.facet_key,
            count
          })
          break
      }
    }

    // Apply optional facet limits
    if (FACETS_LIMIT) {
      facets.sets = facets.sets.slice(0, FACETS_LIMIT)
      facets.rarity = facets.rarity.slice(0, FACETS_LIMIT)
      facets.printing = facets.printing.slice(0, FACETS_LIMIT)
    }

    return facets
  })

  return facets
}

// Main optimized facets function with SWR caching
export async function buildFacetsOptimized(params: FacetParams): Promise<SearchFacets> {
  const t0 = Date.now()
  
  // Build facet cache key (separate from items cache)
  const facetCacheKey = buildFacetCacheKey({
    q: params.queryTokens.join(' '),
    mode: 'name', // Default mode for facets
    printing: params.printing,
    sets: params.setList,
    rarity: params.rarity,
    groupId: params.groupId,
    showUnavailable: params.showUnavailable
  })

  // Log cache key independence from sort/page/limit
  console.log(JSON.stringify({
    event: 'facets.cache.key',
    keyHash: facetCacheKey.length,
    independentOf: ['sort', 'page', 'limit']
  }))

  try {
    // Use SWR caching with single-flight protection
    const facets = await cache.withLock(
      `facets:${facetCacheKey}`,
      5000, // 5 second lock
      async () => {
        return await cache.getSWR(
          facetCacheKey,
          FACETS_TTL_FRESH,
          FACETS_TTL_STALE,
          async () => {
            try {
              const candidates = await getCandidates(params)
              console.log(JSON.stringify({
                event: 'facets.debug',
                candidateCount: candidates.length,
                hasCandidateIds: Boolean(params.candidateIds?.length),
                queryTokens: params.queryTokens.length
              }))
                return await computeFacetsFromCandidates(candidates, params.idType)
            } catch (error) {
              console.error('Error in facets computation:', error)
              return {
                sets: [],
                rarity: [],
                printing: []
              }
            }
          }
        )
      }
    )

    const t1 = Date.now()
    const driver = process.env.CACHE_DRIVER || 'memory'
    
    // Determine cache status based on timing
    const isCacheHit = t1 - t0 < 50 // Fresh cache hit should be < 50ms
    const isStaleHit = t1 - t0 < 200 && t1 - t0 >= 50 // Stale hit should be 50-200ms
    
    console.log(JSON.stringify({
      event: 'facets.cache',
      op: isCacheHit ? 'hit' : isStaleHit ? 'stale-hit' : 'miss',
      driver,
      keyHash: facetCacheKey.length,
      fresh: isCacheHit,
      latencyMs: t1 - t0
    }))

    return facets
  } catch (error) {
    console.error('Facets computation error:', error)
    
    // Fallback to empty facets on error
    return {
      sets: [],
      rarity: [],
      printing: []
    }
  }
}

// Legacy compatibility function for gradual migration
export async function buildFacets(params: FacetParams): Promise<SearchFacets> {
  return buildFacetsOptimized(params)
}
