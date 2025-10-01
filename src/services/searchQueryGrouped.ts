import { prisma } from '@/lib/prisma'
import { cacheGetJSON, cacheSetJSON } from '@/lib/cache'
import type { SortOption } from '@/search/sort'
import { parseSortParam } from '@/search/sort'
import { Prisma } from '@prisma/client'

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
}

export type GroupedResult = {
  query: string
  page: number
  pageSize: number
  totalResults: number // 0 when unknown (lazy total)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- results are shaped in SQL layer
  primary: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- results are shaped in SQL layer
  otherNameMatches: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- results are shaped in SQL layer
  broad: any[]
  nextPageToken: string | null
  facets: {
    sets: Array<{ code: string; name: string; count: number }>
    rarity: Array<{ key: string; count: number }>
    printing: Array<{ key: string; count: number }>
    approx?: boolean
  }
}

function normalize(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9\s"']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(q: string) {
  const quoted = q.match(/\"([^\"]+)\"/)
  if (quoted) return { exactQuoted: true, tokens: [quoted[1].trim()].filter(Boolean) }
  const stopwords = new Set([
    'in','of','the','de','la','el','da','do','del','los','las','y','e','o','a','un','una','uno'
  ])
  const raw = q.split(' ').filter(Boolean)
  if (raw.length === 0) return { exactQuoted: false, tokens: [] }
  const last = raw[raw.length - 1]
  const mids = raw.slice(0, -1)
  const filtered = mids
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopwords.has(t))
  const keptLast = last.trim()
  const tokens = [...filtered, keptLast]
  return { exactQuoted: false, tokens }
}

export async function groupedSearch(params: GroupedParams): Promise<GroupedResult> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(25, Math.max(1, params.pageSize || 25))
  const sort = parseSortParam(params.sort || 'relevance')
  const q0 = normalize(params.q || '')
  const { tokens, exactQuoted } = tokenize(q0)
  const exact = Boolean(params.exactOnly) || exactQuoted
  const mode = params.mode || 'name'
  const groupId = (params.groupId || '').trim()
  // Allow empty query when filters (like set) are provided
  const hasFilters = (Array.isArray(params.printing) && params.printing.length > 0)
    || (Array.isArray(params.rarity) && params.rarity.length > 0)
    || (Array.isArray(params.sets) && params.sets.length > 0)
  if (tokens.length === 0 && !groupId && !hasFilters) {
    return { query: params.q || '', page, pageSize, totalResults: 0, primary: [], otherNameMatches: [], broad: [], nextPageToken: null, facets: { sets: [], rarity: [], printing: [] } }
  }
  const printing = Array.isArray(params.printing) ? params.printing : []
  const rarity = Array.isArray(params.rarity) ? params.rarity : []
  const setList = Array.isArray(params.sets) ? params.sets.filter(Boolean).map((s) => s.toUpperCase()) : []

  const tsQuery = tokens.length > 0 ? tokens.map((t) => `${t}:*`).join(' & ') : ''
  const tsQueryPhrase = tokens.length > 1 ? `${tokens.map((t) => `${t}:*`).join(' <1> ')}` : ''
  const andTextWhere = tokens.length === 0
    ? Prisma.sql`true`
    : Prisma.sql`(
        to_tsvector('simple', unaccent(lower(si.title))) @@ to_tsquery('simple', ${tsQuery})
      )`
  const normExpr = Prisma.sql`regexp_replace(unaccent(lower(si.title)), '[^a-z0-9]+', ' ', 'g')`

  const tStart = Date.now()
  const itemsKey = JSON.stringify({ kind: 'items', q: params.q || '', page, pageSize, printing, sets: setList, rarity, groupId, sort })
  const facetsKey = JSON.stringify({ kind: 'facets', q: params.q || '', printing, sets: setList, rarity, groupId })
  const totalKey = JSON.stringify({ kind: 'total_est', q: params.q || '', printing, sets: setList, rarity, groupId })
  const ttlSeconds = 300
  try {
    const cached = await cacheGetJSON<GroupedResult>(itemsKey)
    if (cached) {
      try { console.log(JSON.stringify({ event: 'search.cache_hit', keyLen: itemsKey.length, savedMs: 'unknown' })) } catch {}
      return cached
    }
  } catch {}
  const tAfterCount = Date.now()

  const first = tokens[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw query rows
  const itemsRaw: any[] = await prisma.$queryRaw(Prisma.sql`
    WITH base AS (
      SELECT si.id,
             si."groupId",
             si.title,
             si."subtitle",
             si."imageNormalUrl",
             si."setCode",
             COALESCE(si."setName", s.set_name) AS "setName",
             si."collectorNumber",
             si."variantLabel" AS variant_label,
             si."finishLabel" AS finish_label,
             si."sortScore" AS sort_score,
             COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS rel,
             char_length(si.title) AS name_len,
             -- ranking signals
             (CASE WHEN unaccent(lower(si.title)) = ${q0} THEN 1 ELSE 0 END) AS exact_name,
             (CASE WHEN ${tokens.length > 1 ? Prisma.sql`to_tsvector('simple', unaccent(lower(si.title))) @@ to_tsquery('simple', ${tsQueryPhrase})` : Prisma.sql`false`} THEN 1 ELSE 0 END) AS phrase_prefix_in_order,
             (CASE WHEN ${tokens.length > 0 ? Prisma.sql`to_tsvector('simple', unaccent(lower(si.title))) @@ to_tsquery('simple', ${tsQuery})` : Prisma.sql`false`} THEN 1 ELSE 0 END) AS all_tokens_prefix_any_order,
             ${tokens.length > 0
               ? Prisma.sql`LEAST(4, (SELECT COUNT(*) FROM unnest(ARRAY[${Prisma.raw(tokens.map((t) => `'${t}'`).join(','))}]) AS t(tok) WHERE ${normExpr} ~ (E'\\m' || t.tok)))`
               : Prisma.sql`0`
             } AS start_of_word_count,
             0.0 AS token_coverage_ratio,
             (CASE WHEN lower(si."setCode") IN ('plst','sld','plist') THEN 0 ELSE 1 END) AS primary_set_first,
             mc."priceUsd" AS "priceUsd",
             mc."priceUsdFoil" AS "priceUsdFoil",
             mc."priceUsdEtched" AS "priceUsdEtched",
             mc."finishes" AS finishes,
             mc."rarity" AS rarity
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
      WHERE si.game = 'mtg' AND si."isPaper" = true AND (${andTextWhere})
        ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
        ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
    ), base2 AS (
      SELECT *,
             COALESCE(variant_label, '') AS variant_group,
             CASE
               WHEN finish_label IN ('Standard', 'Nonfoil', 'Foil', '') THEN 'Standard'
               ELSE COALESCE(finish_label, '')
             END AS finish_group,
             (CASE WHEN finishes @> ARRAY['nonfoil']::text[] THEN true ELSE false END) AS has_nonfoil,
             (CASE WHEN finishes @> ARRAY['foil']::text[] THEN true ELSE false END) AS has_foil,
             (CASE WHEN finishes @> ARRAY['etched']::text[] THEN true ELSE false END) AS has_etched,
             NULLIF("priceUsd", 0) AS price_nonfoil,
             NULLIF("priceUsdFoil", 0) AS price_foil,
             NULLIF("priceUsdEtched", 0) AS price_etched,
             -- min/max across available finish prices for this printing
             (CASE WHEN (NULLIF("priceUsd",0) IS NULL AND NULLIF("priceUsdFoil",0) IS NULL AND NULLIF("priceUsdEtched",0) IS NULL)
                   THEN NULL
                   ELSE LEAST(COALESCE(NULLIF("priceUsd",0), 1e12), COALESCE(NULLIF("priceUsdFoil",0), 1e12), COALESCE(NULLIF("priceUsdEtched",0), 1e12))
              END) AS price_any_min,
             (CASE WHEN (NULLIF("priceUsd",0) IS NULL AND NULLIF("priceUsdFoil",0) IS NULL AND NULLIF("priceUsdEtched",0) IS NULL)
                   THEN NULL
                   ELSE GREATEST(COALESCE(NULLIF("priceUsd",0), -1e12), COALESCE(NULLIF("priceUsdFoil",0), -1e12), COALESCE(NULLIF("priceUsdEtched",0), -1e12))
              END) AS price_any_max,
             -- effective price for this row based on finish group; treat 0/NULL as unknown
             (
               CASE
                 WHEN COALESCE(finish_label, '') ILIKE '%etched%'
                   THEN NULLIF("priceUsdEtched", 0)
                 WHEN COALESCE(finish_label, '') ILIKE '%foil%'
                   THEN NULLIF("priceUsdFoil", 0)
                 WHEN finish_label IS NULL OR finish_label IN ('', 'Standard', 'Nonfoil')
                   THEN NULLIF("priceUsd", 0)
                 ELSE COALESCE(NULLIF("priceUsd", 0), NULLIF("priceUsdFoil", 0), NULLIF("priceUsdEtched", 0))
               END
             ) AS price_effective
      FROM base
    ), groups AS (
      SELECT "groupId",
             "setCode",
             "collectorNumber",
             variant_group,
             finish_group,
             MAX(exact_name) AS exact_name,
             MAX(phrase_prefix_in_order) AS phrase_prefix_in_order,
             MAX(all_tokens_prefix_any_order) AS all_tokens_prefix_any_order,
             MAX(start_of_word_count) AS start_of_word_count,
             MAX(token_coverage_ratio) AS token_coverage_ratio,
             MAX(primary_set_first) AS primary_set_first,
             MIN(name_len) AS name_len,
             MAX(rel) AS rel,
             MIN(title) AS title,
             MAX(sort_score) AS sort_score,
             MIN(price_effective) AS min_price,
             MAX(price_effective) AS max_price,
             LEAST(MIN(price_nonfoil), MIN(price_foil), MIN(price_etched)) AS min_any_price,
             GREATEST(MAX(price_nonfoil), MAX(price_foil), MAX(price_etched)) AS max_any_price
      FROM base2
      GROUP BY "groupId", "setCode", "collectorNumber", variant_group, finish_group
    ), filtered_groups AS (
      SELECT * FROM groups
      WHERE 1=1
        ${printing.length > 0 ? Prisma.sql`
          AND (
            ${printing.includes('etched') ? Prisma.sql`EXISTS (SELECT 1 FROM base2 b WHERE b."groupId" = groups."groupId" AND b."setCode" = groups."setCode" AND b."collectorNumber" = groups."collectorNumber" AND b.variant_group = groups.variant_group AND b.finish_group = groups.finish_group AND b.has_etched = true)` : Prisma.sql`false`}
            ${printing.includes('foil') ? Prisma.sql`OR EXISTS (SELECT 1 FROM base2 b WHERE b."groupId" = groups."groupId" AND b."setCode" = groups."setCode" AND b."collectorNumber" = groups."collectorNumber" AND b.variant_group = groups.variant_group AND b.finish_group = groups.finish_group AND b.has_foil = true AND b.has_etched = false)` : Prisma.sql``}
            ${printing.includes('normal') ? Prisma.sql`OR EXISTS (SELECT 1 FROM base2 b WHERE b."groupId" = groups."groupId" AND b."setCode" = groups."setCode" AND b."collectorNumber" = groups."collectorNumber" AND b.variant_group = groups.variant_group AND b.finish_group = groups.finish_group AND b.has_nonfoil = true)` : Prisma.sql``}
          )
        ` : Prisma.sql``}
        ${rarity.length > 0 ? Prisma.sql`AND EXISTS (SELECT 1 FROM base2 b WHERE b."groupId" = groups."groupId" AND b."setCode" = groups."setCode" AND b."collectorNumber" = groups."collectorNumber" AND b.variant_group = groups.variant_group AND b.finish_group = groups.finish_group AND lower(b.rarity) = ANY(${rarity.map((r) => r.toLowerCase())}))` : Prisma.sql``}
    ), scored AS (
      SELECT *,
        (exact_name * 100.0) +
        (phrase_prefix_in_order * 60.0) +
        (all_tokens_prefix_any_order * 40.0) +
        (start_of_word_count * 5.0) +
        (primary_set_first * 2.0) +
        LEAST(rel / 1000000000.0, 2.0) AS score
      FROM filtered_groups
    ), page_groups AS (
      SELECT * FROM scored
      ORDER BY
        ${sort === 'name'
          ? Prisma.sql`title ASC, rel DESC, score DESC`
          : sort === 'price_asc'
            ? Prisma.sql`COALESCE(min_price, min_any_price) ASC NULLS LAST, rel DESC, title ASC`
            : sort === 'price_desc'
              ? Prisma.sql`COALESCE(max_price, max_any_price) DESC NULLS LAST, rel DESC, title ASC`
              : sort === 'release_desc'
                ? Prisma.sql`rel DESC, title ASC`
                : Prisma.sql`score DESC, rel DESC, title ASC`
        }
      LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
    )
    SELECT g."groupId",
           g."setCode",
           g."collectorNumber",
           g.variant_group AS "variantLabel",
           g.finish_group AS "finishLabel",
           b.id,
           b.title,
           b."setCode",
           b."setName",
           b."collectorNumber",
           b."imageNormalUrl",
           b."priceUsd",
           b."priceUsdFoil",
           b."priceUsdEtched",
           b.rarity,
           (CASE WHEN b.has_nonfoil THEN true ELSE false END) AS "hasNonfoil",
           (CASE WHEN b.has_foil THEN true ELSE false END) AS "hasFoil",
           (CASE WHEN b.has_etched THEN true ELSE false END) AS "hasEtched",
           g.rel,
           g.score
    FROM page_groups g
    JOIN LATERAL (
      SELECT id, title, "setCode", "setName", "collectorNumber", "imageNormalUrl", "priceUsd", "priceUsdFoil", "priceUsdEtched",
             rarity, rel,
             has_nonfoil, has_foil, has_etched
      FROM base2 b
      WHERE b."groupId" = g."groupId" AND b."setCode" = g."setCode" AND b."collectorNumber" = g."collectorNumber" AND b.variant_group = g.variant_group AND b.finish_group = g.finish_group
      ORDER BY
        ${sort === 'price_asc' ? Prisma.sql`b.price_any_min ASC NULLS LAST` : Prisma.sql`1`},
        ${sort === 'price_desc' ? Prisma.sql`b.price_any_max DESC NULLS LAST` : Prisma.sql`1`},
        b.sort_score DESC NULLS LAST, b.rel DESC, b.title ASC
      LIMIT 1
    ) b ON TRUE
  `)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- numeric coercion helper
  function asNum(v: any): number | null {
    if (v === null || v === undefined) return null
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  const hasMore = itemsRaw.length > pageSize
  const items = (hasMore ? itemsRaw.slice(0, pageSize) : itemsRaw).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- constructing response object from raw row
    const obj: any = {
      ...r,
      title: String(r?.title || '').replace(/\(Full Art\)/gi, '(Borderless)'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row field access
      priceUsd: asNum((r as any).priceUsd),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row field access
      priceUsdFoil: asNum((r as any).priceUsdFoil),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row field access
      priceUsdEtched: asNum((r as any).priceUsdEtched),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row field access
      rel: asNum((r as any).rel),
    }
    if (!params.debug) delete obj.score
    return obj
  })

  const nextPageToken = hasMore ? Buffer.from(String(page + 1)).toString('base64') : null
  const tAfterItems = Date.now()

  // Facets in two phases
  const facetLimit = 10000
  const tFacet1Start = Date.now()
  // Try cached facets first
  let cachedFacets = await cacheGetJSON<{ sets: any[]; rarity: any[]; printing: any[] }>(facetsKey)
  let idRows: Array<{ id: string; setCode: string; setName: string | null; rarity: string | null; has_nonfoil: boolean; has_foil: boolean; has_etched: boolean }> = []
  if (!cachedFacets) {
    idRows = await prisma.$queryRaw(Prisma.sql`
    WITH base AS (
      SELECT si.id, si."groupId", si."variantLabel" AS variant_label, si."finishLabel" AS finish_label,
             si."setCode", COALESCE(si."setName", s.set_name) AS "setName", si."collectorNumber",
             mc."finishes" AS finishes, mc."rarity" AS rarity
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      LEFT JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
      WHERE si.game = 'mtg' AND si."isPaper" = true AND (${andTextWhere})
        ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
        ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
    ), base2 AS (
      SELECT id, "setCode", "setName",
             COALESCE(variant_label, '') AS variant_group,
             CASE WHEN finish_label IN ('Standard','Nonfoil','Foil','') THEN 'Standard' ELSE COALESCE(finish_label,'') END AS finish_group,
             (CASE WHEN finishes @> ARRAY['nonfoil']::text[] THEN true ELSE false END) AS has_nonfoil,
             (CASE WHEN finishes @> ARRAY['foil']::text[] THEN true ELSE false END) AS has_foil,
             (CASE WHEN finishes @> ARRAY['etched']::text[] THEN true ELSE false END) AS has_etched,
             COALESCE(rarity, '') AS rarity,
             "groupId", "collectorNumber"
      FROM base
    ), matches AS (
      SELECT DISTINCT ON ("groupId","setCode","collectorNumber", variant_group, finish_group)
             id, "setCode", "setName", rarity,
             has_nonfoil, has_foil, has_etched
      FROM base2
      WHERE 1=1
        ${printing.length > 0 ? Prisma.sql`
          AND (
            ${printing.includes('etched') ? Prisma.sql`has_etched = true` : Prisma.sql`false`}
            ${printing.includes('foil') ? Prisma.sql`OR (has_foil = true AND has_etched = false)` : Prisma.sql``}
            ${printing.includes('normal') ? Prisma.sql`OR has_nonfoil = true` : Prisma.sql``}
          )
        ` : Prisma.sql``}
        ${rarity.length > 0 ? Prisma.sql`AND lower(rarity) = ANY(${rarity.map((r) => r.toLowerCase())})` : Prisma.sql``}
      LIMIT ${Prisma.raw(String(params.facetAll ? facetLimit * 10 : facetLimit))}
    )
    SELECT * FROM matches
  `)
  }
  const tFacet1End = Date.now()

  const approx = !params.facetAll && (!cachedFacets ? (Array.isArray(idRows) && idRows.length >= facetLimit) : false)
  const tFacet2Start = Date.now()
  const setsAggMap = new Map<string, { code: string; name: string; count: number }>()
  const rarityAggMap = new Map<string, number>()
  let normal = 0, foil = 0, etched = 0
  for (const r of idRows) {
    const code = String(r.setCode || '').toUpperCase()
    const name = r.setName || code
    const cur = setsAggMap.get(code) || { code, name, count: 0 }
    cur.count += 1
    setsAggMap.set(code, cur)

    const rar = String(r.rarity || '').toLowerCase()
    rarityAggMap.set(rar, (rarityAggMap.get(rar) || 0) + 1)

    if (r.has_etched) etched += 1
    if (r.has_foil && !r.has_etched) foil += 1
    if (r.has_nonfoil) normal += 1
  }
  const setsAggFull = Array.from(setsAggMap.values()).sort((a, b) => b.count - a.count)
  const rarityAggFull = Array.from(rarityAggMap.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
  const setsAgg = params.facetAll ? setsAggFull : setsAggFull.slice(0, 8)
  const rarityAgg = params.facetAll ? rarityAggFull : rarityAggFull.slice(0, 8)
  const printingAgg = [
    { key: 'normal', count: normal },
    { key: 'foil', count: foil },
    { key: 'etched', count: etched },
  ]
  const tFacet2End = Date.now()

  const facets = cachedFacets ? { ...cachedFacets, approx: false } : { sets: setsAgg, rarity: rarityAgg, printing: printingAgg, approx }

  // Try to get a cached total estimate (non-blocking for SSR). If missing, compute in background with low timeout.
  let totalEst = 0
  try {
    const cachedTotal = await cacheGetJSON<number>(totalKey)
    if (typeof cachedTotal === 'number' && cachedTotal >= 0) totalEst = cachedTotal
  } catch {}
  if (totalEst === 0) {
    // Fire-and-forget background estimation using EXPLAIN (fast and non-blocking)
    ;(async () => {
      try {
        await prisma.$transaction(async (tx) => {
          try { await tx.$executeRawUnsafe('SET LOCAL statement_timeout = 300') } catch {}
          const explainRows = await tx.$queryRaw<any[]>(Prisma.sql`
            EXPLAIN (FORMAT JSON)
            SELECT 1
            FROM "public"."SearchIndex" si
            WHERE si.game = 'mtg' AND si."isPaper" = true AND (${andTextWhere})
              ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
              ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
            LIMIT 1000000
          `)
          let n = 0
          try {
            const payload = (explainRows?.[0] as any)?.['QUERY PLAN']
            const arr = Array.isArray(payload) ? payload : JSON.parse(JSON.stringify(payload))
            const root = Array.isArray(arr) ? arr[0] : null
            n = Number(root?.Plan?.['Plan Rows'] || 0)
          } catch {}
          await cacheSetJSON(totalKey, n, ttlSeconds)
        }, { timeout: 1200 })
      } catch {}
    })()
  }

  // Background cache set for facets when not cached
  if (!cachedFacets) {
    cacheSetJSON(facetsKey, { sets: setsAgg, rarity: rarityAgg, printing: printingAgg }, ttlSeconds).catch(() => {})
  }

  try {
    console.log(JSON.stringify({
      event: 'search.perf',
      q: params.q || '',
      filters: { printing, sets: setList, rarity, groupId },
      timingsMs: {
        total: Date.now() - tStart,
        db_items_ms: tAfterItems - tAfterCount,
        db_facets_ms: cachedFacets ? 0 : (tFacet1End - tFacet1Start) + (tFacet2End - tFacet2Start),
        cache_ms: cachedFacets ? (tFacet1End - tFacet1Start) : 0,
        serialize_ms: 0,
      },
      warn: (Date.now() - tStart) > 1000 ? 'slow' : undefined,
    }))
  } catch {}

  const accurateIfTerminal = !hasMore ? ((page - 1) * pageSize + items.length) : 0
  const totalForClient = accurateIfTerminal > 0 ? accurateIfTerminal : 0

  const result: GroupedResult = {
    query: params.q || '',
    page,
    pageSize,
    totalResults: totalForClient,
    primary: items,
    otherNameMatches: [],
    broad: [],
    nextPageToken,
    facets,
  }

  try {
    if (params.debug) {
      console.log(JSON.stringify({ event: 'search.tokens', tokens }))
      console.log(JSON.stringify({ event: 'search.mode', mode_requested: params.mode || 'name', mode_final: 'name', fallback: 'none' }))
    }
  } catch {}

  try {
    if (!params.debug) {
      const tSet0 = Date.now()
      await cacheSetJSON(itemsKey, result, ttlSeconds)
      try { console.log(JSON.stringify({ event: 'search.cache_set', keyLen: itemsKey.length, ttl: ttlSeconds, latencyMs: Date.now() - tSet0 })) } catch {}
    } else {
      try { console.log(JSON.stringify({ event: 'search.cache_skip_debug' })) } catch {}
    }
  } catch {}
  return result
}


