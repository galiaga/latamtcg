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
  const pageSize = Math.min(24, Math.max(1, params.pageSize || 24))
  const q0 = normalize(params.q || '')
  const { tokens } = tokenize(q0)
  if (tokens.length === 0) {
    return { query: params.q || '', page, pageSize, totalResults: 0, primary: [], otherNameMatches: [], broad: [], nextPageToken: null }
  }

  const normExpr = Prisma.sql`regexp_replace(unaccent(lower(title)), '[^a-z0-9]+', ' ', 'g')`
  const andPrefixes = tokens
    .map((t) => Prisma.sql`${normExpr} ~ ${`\\m${t}`}`)
    .reduce((a, b) => Prisma.sql`${a} AND ${b}`)

  const totalRows: Array<{ count: bigint }> = await prisma.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM "public"."SearchIndex"
    WHERE game = 'mtg' AND "isPaper" = true AND (${andPrefixes})
  `)
  const totalResults = Number(totalRows?.[0]?.count || 0)

  const first = tokens[0]
  const items: any[] = await prisma.$queryRaw(Prisma.sql`
    SELECT id, "groupId", game, title, subtitle, "imageNormalUrl", "setCode", "setName", "collectorNumber",
           CASE WHEN ${normExpr} ~ ${`\\m${first}`} THEN 1 ELSE 0 END AS first_boost,
           char_length(title) AS name_len,
           COALESCE(EXTRACT(EPOCH FROM "releasedAt"), 0) AS rel
    FROM "public"."SearchIndex"
    WHERE game = 'mtg' AND "isPaper" = true AND (${andPrefixes})
    ORDER BY first_boost DESC, name_len ASC, rel DESC, title ASC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `)

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


