import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type GroupedParams = {
  q: string
  page?: number
  pageSize?: number
  exactOnly?: boolean
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
  if (tokens.length === 0) {
    return { query: params.q || '', page, pageSize, totalResults: 0, primary: [], otherNameMatches: [], broad: [], nextPageToken: null }
  }

  const normExpr = Prisma.sql`regexp_replace(unaccent(lower(title)), '[^a-z0-9]+', ' ', 'g')`
  const andPrefixes = exact
    ? Prisma.sql`${normExpr} = ${q0}`
    : tokens
        .map((t) => Prisma.sql`${normExpr} ~ ${`\\m${t}`}`)
        .reduce((a, b) => Prisma.sql`${a} AND ${b}`)

  // Count distinct grouped results (oracle + variant + finishGroup)
  const totalRows: Array<{ count: bigint }> = await prisma.$queryRaw(Prisma.sql`
    WITH base AS (
      SELECT si."groupId",
             si."variantLabel" AS variant_label,
             si."finishLabel" AS finish_label,
             si."setCode",
             si."collectorNumber"
      FROM "public"."SearchIndex" si
      WHERE si.game = 'mtg' AND si."isPaper" = true AND (${andPrefixes})
    ), base2 AS (
      SELECT "groupId",
             COALESCE(variant_label, '') AS variant_group,
             CASE
               WHEN finish_label IN ('Standard', 'Nonfoil', 'Foil', '') THEN 'Standard'
               ELSE COALESCE(finish_label, '')
             END AS finish_group,
             "setCode",
             "collectorNumber"
      FROM base
    )
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT DISTINCT ("groupId", "setCode", "collectorNumber", variant_group, finish_group) FROM base2
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
             COALESCE(EXTRACT(EPOCH FROM si."releasedAt"), 0) AS rel,
             char_length(si.title) AS name_len,
             CASE WHEN ${normExpr} ~ ${`\\m${first}`} THEN 1 ELSE 0 END AS first_boost,
             COALESCE(mc."priceUsd", mc."priceUsdFoil") AS "priceUsd"
      FROM "public"."SearchIndex" si
      LEFT JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
      WHERE si.game = 'mtg' AND si."isPaper" = true AND (${andPrefixes})
    ), base2 AS (
      SELECT *,
             COALESCE(variant_label, '') AS variant_group,
             CASE
               WHEN finish_label IN ('Standard', 'Nonfoil', 'Foil', '') THEN 'Standard'
               ELSE COALESCE(finish_label, '')
             END AS finish_group
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
             MIN(title) AS title
      FROM base2
      GROUP BY "groupId", "setCode", "collectorNumber", variant_group, finish_group
    ), page_groups AS (
      SELECT * FROM groups
      ORDER BY first_boost DESC, name_len ASC, rel DESC, title ASC
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
           g.rel
    FROM page_groups g
    JOIN LATERAL (
      SELECT id, title, "setCode", "setName", "collectorNumber", "imageNormalUrl", "priceUsd", rel
      FROM base2 b
      WHERE b."groupId" = g."groupId" AND b."setCode" = g."setCode" AND b."collectorNumber" = g."collectorNumber" AND b.variant_group = g.variant_group AND b.finish_group = g.finish_group
      ORDER BY b.rel DESC
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


