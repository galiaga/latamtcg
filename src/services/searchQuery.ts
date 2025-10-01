import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type SearchParams = {
  q: string
  game?: string
  lang?: 'en' | 'all'
  limit?: number
}

export type SearchItem = {
  kind: 'printing' | 'group'
  id?: string
  groupId: string
  game: string
  title: string
  subtitle?: string
  finishLabel?: string | null
  variantLabel?: string | null
  lang?: string
  isPaper?: boolean
  releasedAt?: string | null
  imageNormalUrl?: string | null
  setCode?: string
  setName?: string | null
  collectorNumber?: string
}

function normalize(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9#:\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseModifiers(qNorm: string) {
  const tokens = qNorm.split(' ').filter(Boolean)
  const modifiers = {
    set: [] as string[],
    foil: false,
    etched: false,
    borderless: false,
    showcase: false,
    extended: false,
    retro: false,
    jp: false,
  }
  const rest: string[] = []
  for (const t of tokens) {
    if (t.startsWith('set:') && t.length > 4) {
      modifiers.set.push(t.slice(4))
      continue
    }
    switch (t) {
      case 'foil': modifiers.foil = true; break
      case 'etched': modifiers.etched = true; break
      case 'borderless': modifiers.borderless = true; break
      case 'showcase': modifiers.showcase = true; break
      case 'extended': modifiers.extended = true; break
      case 'retro': modifiers.retro = true; break
      case 'jp': modifiers.jp = true; break
      default:
        // set codes often appear as tokens; heuristically treat a 2-4 char token as set code boost
        if (/^[a-z0-9]{2,4}$/.test(t)) modifiers.set.push(t)
        rest.push(t)
    }
  }
  return { modifiers, tokens: rest, firstToken: rest[0] || '' }
}

export async function searchSuggestions(params: SearchParams): Promise<SearchItem[]> {
  const backend = process.env.SEARCH_BACKEND || 'postgres'
  if (backend !== 'postgres') {
    // Placeholder for alternative backends
    return []
  }

  const game = (params.game || 'mtg').toLowerCase()
  const limit = Math.max(1, Math.min(Number(params.limit || process.env.SEARCH_SUGGESTION_LIMIT || 15), 50))
  const langPref: 'en' | 'all' = params.lang === 'all' || process.env.SEARCH_LANGS === 'all' ? 'all' : 'en'
  const qNorm = normalize(params.q || '')
  if (!qNorm) return []
  const { modifiers, tokens, firstToken } = parseModifiers(qNorm)
  const first = firstToken || qNorm

  // Build SQL with ranking (preferred path via SearchIndex table)
  let results: any[]
  try {
    results = await prisma.$queryRaw(
    Prisma.sql`
      WITH candidates AS (
        SELECT
          id,
          "groupId",
          game,
          title,
          subtitle,
          "finishLabel",
          "variantLabel",
          lang,
          "isPaper",
          "releasedAt",
          "imageNormalUrl",
          "setCode",
          "setName",
          "collectorNumber",
          name,
          -- signals
          (CASE WHEN unaccent(lower(title)) = ${qNorm} THEN 1 ELSE 0 END) AS exact_title,
          (CASE WHEN unaccent(lower(title)) LIKE ${first + '%'} THEN 1 ELSE 0 END) AS prefix_title,
          (CASE WHEN to_tsvector('simple', unaccent(lower("keywordsText"))) @@ plainto_tsquery('simple', ${qNorm}) THEN 1 ELSE 0 END) AS ts_hit,
          GREATEST(similarity(unaccent(lower(title)), ${qNorm}), similarity(unaccent(lower("keywordsText")), ${qNorm})) AS trigram_sim
        FROM "public"."SearchIndex"
        WHERE game = ${game}
          AND "isPaper" = true
          AND (${langPref === 'all' ? Prisma.sql`true` : Prisma.sql`lang = 'en'`})
          AND (
            unaccent(lower(title)) LIKE ${first + '%'}
            OR to_tsvector('simple', unaccent(lower("keywordsText"))) @@ plainto_tsquery('simple', ${qNorm})
            OR similarity(unaccent(lower(title)), ${qNorm}) > 0.2
            OR similarity(unaccent(lower("keywordsText")), ${qNorm}) > 0.2
          )
      ), scored AS (
        SELECT *,
          -- base ranking
          (exact_title * 10.0) +
          (prefix_title * 5.0) +
          (ts_hit * 2.5) +
          (trigram_sim * 2.0) +
          -- language & paper boosts
          (CASE WHEN lang = 'en' THEN 0.8 ELSE 0.0 END) +
          (CASE WHEN "isPaper" THEN 0.5 ELSE 0.0 END) +
          -- set boost
          (CASE WHEN ${modifiers.set.length > 0 ? Prisma.sql`lower("setCode") = ANY(${modifiers.set.map((s) => s.toLowerCase())})` : Prisma.sql`false`} THEN 1.2 ELSE 0.0 END) +
          -- variant boosts
          (CASE WHEN ${modifiers.borderless ? Prisma.sql`coalesce("variantLabel", '') ILIKE '%borderless%'` : Prisma.sql`false`} THEN 0.8 ELSE 0.0 END) +
          (CASE WHEN ${modifiers.showcase ? Prisma.sql`coalesce("variantLabel", '') ILIKE '%showcase%'` : Prisma.sql`false`} THEN 0.7 ELSE 0.0 END) +
          (CASE WHEN ${modifiers.extended ? Prisma.sql`coalesce("variantLabel", '') ILIKE '%extended%'` : Prisma.sql`false`} THEN 0.7 ELSE 0.0 END) +
          (CASE WHEN ${modifiers.retro ? Prisma.sql`coalesce("variantLabel", '') ILIKE '%retro%'` : Prisma.sql`false`} THEN 0.6 ELSE 0.0 END) +
          (CASE WHEN ${modifiers.jp ? Prisma.sql`coalesce("variantLabel", '') ILIKE '%jp%'` : Prisma.sql`false`} THEN 0.5 ELSE 0.0 END) +
          -- finish boosts, unless specifically searched
          (CASE WHEN ${modifiers.foil ? Prisma.sql`true` : Prisma.sql`false`} THEN (CASE WHEN coalesce("finishLabel", '') ILIKE '%foil%' THEN 0.9 ELSE 0 END) ELSE (CASE WHEN coalesce("finishLabel", '') = 'Nonfoil' THEN 0.4 WHEN coalesce("finishLabel", '') = 'Foil' THEN 0.2 ELSE 0 END) END) +
          (CASE WHEN ${modifiers.etched ? Prisma.sql`true` : Prisma.sql`false`} THEN (CASE WHEN coalesce("finishLabel", '') ILIKE '%etched%' THEN 0.9 ELSE 0 END) ELSE 0 END) +
          -- recency tie-breaker
          (COALESCE(EXTRACT(EPOCH FROM "releasedAt"), 0) / 31557600.0) * 0.02
          AS score
        FROM candidates
      )
      SELECT * FROM scored
      ORDER BY score DESC, "releasedAt" DESC NULLS LAST
      LIMIT ${Math.min(limit * 3, 60)};
    `
    )
  } catch (err: any) {
    // Fallback if SearchIndex does not exist yet
    const message = String(err?.message || '')
    if (message.includes('relation "public"."SearchIndex" does not exist') || message.includes('relation "public.SearchIndex" does not exist') || message.includes('SearchIndex')) {
      return fallbackSearchFromMtgCard({ qNorm, first, game, langPref, limit, modifiers })
    }
    throw err
  }

  // Post-process and cap to limit, add optional group item
  const items: SearchItem[] = results.map((r) => ({
    kind: 'printing',
    id: r.id,
    groupId: r.groupId,
    game: r.game,
    title: r.title,
    subtitle: r.subtitle,
    finishLabel: r.finishLabel,
    variantLabel: r.variantLabel,
    lang: r.lang,
    isPaper: r.isPaper,
    releasedAt: r.releasedAt ? new Date(r.releasedAt).toISOString() : null,
    imageNormalUrl: r.imageNormalUrl,
    setCode: r.setCode,
    setName: r.setName,
    collectorNumber: r.collectorNumber,
  }))

  // Optionally include a single grouped card at the top when the name strongly matches
  let includeGroup = false
  if (items.length > 0) {
    const top = items[0]
    const titleNorm = normalize(top.title)
    if (titleNorm.startsWith(first)) includeGroup = true
  }

  const limited = items.slice(0, limit)
  if (includeGroup) {
    const top = limited[0]
    if (top) {
      const group: SearchItem = {
        kind: 'group',
        groupId: top.groupId,
        game,
        title: top.title,
      }
      return [group, ...limited].slice(0, limit)
    }
  }
  return limited
}

async function fallbackSearchFromMtgCard(args: { qNorm: string; first: string; game: string; langPref: 'en' | 'all'; limit: number; modifiers: ReturnType<typeof parseModifiers>['modifiers'] }): Promise<SearchItem[]> {
  const { qNorm, first, langPref, limit, modifiers } = args
  const where: any = { isPaper: true }
  if (langPref !== 'all') where.lang = 'en'

  // Fetch a reasonable candidate set
  const candidates = await prisma.mtgCard.findMany({
    where: {
      AND: [
        where,
        {
          OR: [
            { name: { contains: first, mode: 'insensitive' } },
            { setCode: { contains: first, mode: 'insensitive' } },
            // set name now from relation or search index; omit direct column filter
            { collectorNumber: { contains: first, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      scryfallId: true,
      oracleId: true,
      name: true,
      setCode: true,
      set: { select: { set_name: true } },
      collectorNumber: true,
      finishes: true,
      frameEffects: true,
      promoTypes: true,
      fullArt: true,
      lang: true,
      isPaper: true,
      releasedAt: true,
      // no stored image url
    },
    take: 200,
  })

  function norm(s: string) {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
  }

  function pickFinishLabel(finishes: string[], promoTypes: string[]): string | null {
    const types = new Set((promoTypes || []).map((t) => String(t)))
    if (types.has('rainbow-foil')) return 'Rainbow Foil'
    const set = new Set(finishes || [])
    if (set.has('nonfoil')) return 'Nonfoil'
    if (set.has('foil')) return 'Foil'
    if (set.has('etched')) return 'Etched'
    return null
  }

  function variantFromTags(frameEffects: string[], promoTypes: string[], setCode: string, fullArt?: boolean | null): string | null {
    const fe = new Set(frameEffects || [])
    const pt = new Set(promoTypes || [])
    if (fe.has('borderless')) return 'Borderless'
    if (fe.has('extendedart')) return 'Extended Art'
    if (fe.has('showcase')) return 'Showcase'
    if (pt.has('retro') || pt.has('retro-frame')) return 'Retro'
  if (fullArt) return 'Borderless'
    if ((setCode || '').toLowerCase() === 'plst') return 'The List'
    const code = (setCode || '').toUpperCase()
    if (code === 'J18') return 'J18'
    return null
  }

  function subtitle(setCode: string, setName: string | null, collectorNumber: string): string {
    const parts = [String(setCode || '').toUpperCase()]
    if (setName) parts.push(setName)
    if (collectorNumber) parts.push(`#${collectorNumber}`)
    return parts.join(' • ')
  }

  type Scored = { score: number; releasedAtMs: number; item: SearchItem }
  const scored: Scored[] = candidates.map((c) => {
    const displayName = String(c.name || '').replace(/\(Full Art\)/gi, '(Borderless)')
    const titleNorm = norm(displayName)
    const exact = titleNorm === qNorm ? 1 : 0
    const prefix = titleNorm.startsWith(first) ? 1 : 0
    const includes = titleNorm.includes(first) ? 1 : 0
    const finishLabel = pickFinishLabel(c.finishes || [], c.promoTypes || [])
    const variantLabel = variantFromTags(c.frameEffects || [], c.promoTypes || [], c.setCode, c.fullArt)
    const setBoost = modifiers.set.length > 0 && modifiers.set.some((s) => c.setCode.toLowerCase() === s.toLowerCase()) ? 1 : 0
    const variantBoost = (
      (modifiers.borderless && (variantLabel || '').toLowerCase().includes('borderless') ? 0.8 : 0) +
      (modifiers.showcase && (variantLabel || '').toLowerCase().includes('showcase') ? 0.7 : 0) +
      (modifiers.extended && (variantLabel || '').toLowerCase().includes('extended') ? 0.7 : 0) +
      (modifiers.retro && (variantLabel || '').toLowerCase().includes('retro') ? 0.6 : 0)
    )
    const finishBoost = modifiers.foil
      ? ((finishLabel || '').toLowerCase().includes('foil') ? 0.9 : 0)
      : (finishLabel === 'Nonfoil' ? 0.4 : finishLabel === 'Foil' ? 0.2 : 0)
    const etchedBoost = modifiers.etched ? ((finishLabel || '').toLowerCase().includes('etched') ? 0.9 : 0) : 0
    const recency = c.releasedAt ? c.releasedAt.getTime() / 1_000_000_000 : 0

    const score = exact * 10 + prefix * 5 + includes * 2 + setBoost * 1.2 + variantBoost + finishBoost + etchedBoost + recency * 0.02
    const item: SearchItem = {
      kind: 'printing',
      id: c.scryfallId,
      groupId: c.oracleId,
      game: 'mtg',
      title: displayName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- relation set used only for name
      subtitle: subtitle(c.setCode, (c as any).set?.set_name ?? null, c.collectorNumber),
      finishLabel,
      variantLabel,
      lang: c.lang,
      isPaper: Boolean(c.isPaper),
      releasedAt: c.releasedAt ? new Date(c.releasedAt).toISOString() : null,
      imageNormalUrl: c.scryfallId,
      setCode: c.setCode,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- relation set used only for name
      setName: (c as any).set?.set_name ?? null,
      collectorNumber: c.collectorNumber,
    }
    return { score, releasedAtMs: c.releasedAt ? c.releasedAt.getTime() : 0, item }
  })

  scored.sort((a, b) => b.score - a.score || b.releasedAtMs - a.releasedAtMs)
  const limited = scored.slice(0, limit).map((s) => s.item)

  // Optional group row
  if (limited.length > 0) {
    const top = limited[0]
    const titleNorm = norm(top.title)
    if (titleNorm.startsWith(first)) {
      return [{ kind: 'group', groupId: top.groupId, game: 'mtg', title: top.title } as SearchItem, ...limited].slice(0, limit)
    }
  }
  return limited
}



