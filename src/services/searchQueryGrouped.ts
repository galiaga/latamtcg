import { prisma } from '@/lib/prisma'
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
}

export type GroupedResult = {
  query: string
  page: number
  pageSize: number
  totalResults: number
  primary: any[]
  otherNameMatches: any[]
  broad: any[]
  nextPageToken: string | null
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
  return { exactQuoted: false, tokens: q.split(' ').filter(Boolean) }
}

export async function groupedSearch(params: GroupedParams): Promise<GroupedResult> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(25, Math.max(1, params.pageSize || 25))
  const q0 = normalize(params.q || '')
  const { tokens, exactQuoted } = tokenize(q0)
  const exact = Boolean(params.exactOnly) || exactQuoted
  const groupId = (params.groupId || '').trim()
  if (tokens.length === 0 && !groupId) {
    return { query: params.q || '', page, pageSize, totalResults: 0, primary: [], otherNameMatches: [], broad: [], nextPageToken: null }
  }
  const printing = Array.isArray(params.printing) ? params.printing : []
  const rarity = Array.isArray(params.rarity) ? params.rarity : []
  const setList = Array.isArray(params.sets) ? params.sets.filter(Boolean).map((s) => s.toUpperCase()) : []

  const normExpr = Prisma.sql`regexp_replace(unaccent(lower(title)), '[^a-z0-9]+', ' ', 'g')`
  const andPrefixes = tokens.length === 0
    ? Prisma.sql`true`
    : (exact
        ? Prisma.sql`${normExpr} = ${q0}`
        : tokens
            .map((t) => Prisma.sql`${normExpr} ~ ${`\\m${t}`}`)
            .reduce((a, b) => Prisma.sql`${a} AND ${b}`))

  // Count distinct grouped results (oracle + variant + finishGroup)
  const totalRows: Array<{ count: bigint }> = await prisma.$queryRaw(Prisma.sql`
    WITH base AS (
      SELECT si."groupId",
             si."variantLabel" AS variant_label,
             si."finishLabel" AS finish_label,
             si."setCode",
             si."collectorNumber",
             mc."finishes" AS finishes,
             mc."rarity" AS rarity
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      WHERE si.game = 'mtg' AND si."isPaper" = true AND (${andPrefixes})
        ${groupId ? Prisma.sql`AND si."groupId" = ${groupId}` : Prisma.sql``}
        ${setList.length > 0 ? Prisma.sql`AND upper(si."setCode") = ANY(${setList})` : Prisma.sql``}
    ), base2 AS (
      SELECT "groupId",
             COALESCE(variant_label, '') AS variant_group,
             CASE
               WHEN finish_label IN ('Standard', 'Nonfoil', 'Foil', '') THEN 'Standard'
               ELSE COALESCE(finish_label, '')
             END AS finish_group,
             "setCode",
             "collectorNumber",
             (CASE WHEN finishes @> ARRAY['nonfoil']::text[] THEN true ELSE false END) AS has_nonfoil,
             (CASE WHEN finishes @> ARRAY['foil']::text[] THEN true ELSE false END) AS has_foil,
             (CASE WHEN finishes @> ARRAY['etched']::text[] THEN true ELSE false END) AS has_etched,
             COALESCE(rarity, '') AS rarity
      FROM base
    )
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT DISTINCT ("groupId", "setCode", "collectorNumber", variant_group, finish_group) FROM base2
      WHERE 1=1
        ${printing.length > 0 ? Prisma.sql`
          AND (
            ${printing.includes('etched') ? Prisma.sql`(has_etched = true)` : Prisma.sql`false`}
            ${printing.includes('foil') ? Prisma.sql`OR (has_foil = true AND has_etched = false)` : Prisma.sql``}
            ${printing.includes('normal') ? Prisma.sql`OR (has_nonfoil = true)` : Prisma.sql``}
          )
        ` : Prisma.sql``}
        ${rarity.length > 0 ? Prisma.sql`AND lower(rarity) = ANY(${rarity.map((r) => r.toLowerCase())})` : Prisma.sql``}
    ) AS t
  `)
  const totalResults = Number(totalRows?.[0]?.count || 0)

  const first = tokens[0]
  const itemsRaw: any[] = await prisma.$queryRaw(Prisma.sql`
    WITH base AS (
      SELECT si.id,
             si."groupId",
             si.title,
             si."subtitle",
             si."imageNormalUrl",
             si."setCode",
             si."setName",
             si."collectorNumber",
             si."variantLabel" AS variant_label,
             si."finishLabel" AS finish_label,
             si."sortScore" AS sort_score,
             COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS rel,
             char_length(si.title) AS name_len,
             CASE WHEN ${normExpr} ~ ${`\\m${first}`} THEN 1 ELSE 0 END AS first_boost,
             mc."priceUsd" AS "priceUsd",
             mc."priceUsdFoil" AS "priceUsdFoil",
             mc."priceUsdEtched" AS "priceUsdEtched",
             mc."finishes" AS finishes,
             mc."rarity" AS rarity
      FROM "public"."SearchIndex" si
      JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      WHERE si.game = 'mtg' AND si."isPaper" = true AND (${andPrefixes})
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
             (CASE WHEN finishes @> ARRAY['etched']::text[] THEN true ELSE false END) AS has_etched
      FROM base
    ), groups AS (
      SELECT "groupId",
             "setCode",
             "collectorNumber",
             variant_group,
             finish_group,
             MAX(first_boost) AS first_boost,
             MIN(name_len) AS name_len,
             MAX(rel) AS rel,
             MIN(title) AS title,
             MAX(sort_score) AS sort_score
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
    ), page_groups AS (
      SELECT * FROM filtered_groups
      ORDER BY sort_score DESC NULLS LAST, rel DESC, title ASC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
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
           g.rel
    FROM page_groups g
    JOIN LATERAL (
      SELECT id, title, "setCode", "setName", "collectorNumber", "imageNormalUrl", "priceUsd", "priceUsdFoil", "priceUsdEtched",
             rarity, rel,
             has_nonfoil, has_foil, has_etched
      FROM base2 b
      WHERE b."groupId" = g."groupId" AND b."setCode" = g."setCode" AND b."collectorNumber" = g."collectorNumber" AND b.variant_group = g.variant_group AND b.finish_group = g.finish_group
      ORDER BY b.sort_score DESC NULLS LAST, b.rel DESC, b.title ASC
      LIMIT 1
    ) b ON TRUE
  `)
  const items = itemsRaw.map((r) => ({
    ...r,
    title: String(r?.title || '').replace(/\(Full Art\)/gi, '(Borderless)')
  }))

  const nextPageToken = page * pageSize < totalResults ? Buffer.from(String(page + 1)).toString('base64') : null

  return {
    query: params.q || '',
    page,
    pageSize,
    totalResults,
    primary: items,
    otherNameMatches: [],
    broad: [],
    nextPageToken,
  }
}


