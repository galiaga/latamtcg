import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { formatCardVariant } from '@/lib/cards/formatVariant'

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
  variantSuffix?: string | null
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
    return []
  }

  const game = (params.game || 'mtg').toLowerCase()
  const limit = Math.max(1, Math.min(Number(params.limit || process.env.SEARCH_SUGGESTION_LIMIT || 15), 50))
  const langPref: 'en' | 'all' = params.lang === 'all' || process.env.SEARCH_LANGS === 'all' ? 'all' : 'en'
  const qNorm = normalize(params.q || '')
  if (!qNorm) return []

  // Parse query for exact mode and tokens
  const isExactOnly = params.q?.startsWith('"') && params.q?.endsWith('"')
  const query = isExactOnly ? params.q!.slice(1, -1) : params.q!
  const qClean = normalize(query)
  const tokens = qClean.split(/\s+/).filter(t => t.length > 0)
  
  if (tokens.length === 0) return []

  // Build Starts-With priority search with fallbacks
  let results: any[] = []
  
  try {
    // Stage 1: Exact matches (highest priority)
    if (isExactOnly) {
      results = await searchExactMatches({ qClean, game, langPref, limit })
    } else {
      // Stage 2: Starts-With matches (AND logic between tokens)
      results = await searchStartsWithMatches({ tokens, game, langPref, limit })
      
      // Stage 3: Contains matches (if no starts-with results)
      if (results.length === 0) {
        results = await searchContainsMatches({ tokens, game, langPref, limit })
      }
      
      // Stage 4: Light fuzzy matches (if still no results)
      if (results.length === 0) {
        results = await searchFuzzyMatches({ tokens, game, langPref, limit })
      }
    }
  } catch (err: any) {
    const message = String(err?.message || '')
    if (message.includes('relation "public"."SearchIndex" does not exist') || message.includes('relation "public.SearchIndex" does not exist') || message.includes('SearchIndex')) {
      return fallbackSearchFromMtgCard({ qNorm: qClean, first: tokens[0], game, langPref, limit, modifiers: { set: [], borderless: false, showcase: false, extended: false, retro: false, jp: false, foil: false, etched: false } })
    }
    throw err
  }

  // Convert to SearchItem format
  const items: SearchItem[] = results.map((r) => ({
    kind: 'printing',
    id: r.id,
    groupId: r.groupId,
    game: r.game,
    title: r.title,
    subtitle: r.subtitle,
    finishLabel: r.finishLabel,
    variantLabel: r.variantLabel,
    variantSuffix: r.variantSuffix,
    lang: r.lang,
    isPaper: r.isPaper,
    releasedAt: r.releasedAt ? new Date(r.releasedAt).toISOString() : null,
    imageNormalUrl: r.imageNormalUrl,
    setCode: r.setCode,
    setName: r.setName,
    collectorNumber: r.collectorNumber,
  }))

  return items.slice(0, limit)
}

// Stage 1: Exact matches (for quoted queries)
async function searchExactMatches({ qClean, game, langPref, limit }: { qClean: string; game: string; langPref: 'en' | 'all'; limit: number }): Promise<any[]> {
  return await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        id, "groupId", game, title, subtitle, "finishLabel", "variantLabel", "variantSuffix",
        lang, "isPaper", "releasedAt", "imageNormalUrl", "setCode", "setName", "collectorNumber", name,
        1000 AS score
      FROM "public"."SearchIndex"
      WHERE game = ${game}
        AND "isPaper" = true
        AND (${langPref === 'all' ? Prisma.sql`true` : Prisma.sql`lang = 'en'`})
        AND unaccent(lower(title)) = ${qClean}
      ORDER BY "releasedAt" DESC NULLS LAST
      LIMIT ${limit}
    `
  )
}

// Stage 2: Starts-With matches (AND logic between tokens)
async function searchStartsWithMatches({ tokens, game, langPref, limit }: { tokens: string[]; game: string; langPref: 'en' | 'all'; limit: number }): Promise<any[]> {
  // Build word prefix conditions for each token
  const wordPrefixConditions = tokens.map(token => 
    Prisma.sql`unaccent(lower(title)) LIKE ${token + '%'}`
  )
  
  // Build word boundary conditions for each token (more precise)
  const wordBoundaryConditions = tokens.map(token => 
    Prisma.sql`unaccent(lower(title)) ~* ${'\\m' + token}`
  )

  return await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        id, "groupId", game, title, subtitle, "finishLabel", "variantLabel", "variantSuffix",
        lang, "isPaper", "releasedAt", "imageNormalUrl", "setCode", "setName", "collectorNumber", name,
        -- Score based on how many tokens match as word prefixes
        (${tokens.length * 100} + 
         CASE WHEN lang = 'en' THEN 1 ELSE 0 END +
         CASE WHEN "isPaper" THEN 1 ELSE 0 END) AS score
      FROM "public"."SearchIndex"
      WHERE game = ${game}
        AND "isPaper" = true
        AND (${langPref === 'all' ? Prisma.sql`true` : Prisma.sql`lang = 'en'`})
        AND (${Prisma.join(wordBoundaryConditions, ' AND ')})
      ORDER BY score DESC, "releasedAt" DESC NULLS LAST
      LIMIT ${limit}
    `
  )
}

// Stage 3: Contains matches (AND logic between tokens)
async function searchContainsMatches({ tokens, game, langPref, limit }: { tokens: string[]; game: string; langPref: 'en' | 'all'; limit: number }): Promise<any[]> {
  const containsConditions = tokens.map(token => 
    Prisma.sql`unaccent(lower(title)) ILIKE ${'%' + token + '%'}`
  )

  return await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        id, "groupId", game, title, subtitle, "finishLabel", "variantLabel", "variantSuffix",
        lang, "isPaper", "releasedAt", "imageNormalUrl", "setCode", "setName", "collectorNumber", name,
        -- Lower score for contains matches
        (${tokens.length * 50} + 
         CASE WHEN lang = 'en' THEN 1 ELSE 0 END +
         CASE WHEN "isPaper" THEN 1 ELSE 0 END) AS score
      FROM "public"."SearchIndex"
      WHERE game = ${game}
        AND "isPaper" = true
        AND (${langPref === 'all' ? Prisma.sql`true` : Prisma.sql`lang = 'en'`})
        AND (${Prisma.join(containsConditions, ' AND ')})
      ORDER BY score DESC, "releasedAt" DESC NULLS LAST
      LIMIT ${limit}
    `
  )
}

// Stage 4: Light fuzzy matches (edit distance ≤1 per token)
async function searchFuzzyMatches({ tokens, game, langPref, limit }: { tokens: string[]; game: string; langPref: 'en' | 'all'; limit: number }): Promise<any[]> {
  // Use similarity for fuzzy matching with a threshold
  const similarityConditions = tokens.map(token => 
    Prisma.sql`similarity(unaccent(lower(title)), ${token}) > 0.3`
  )

  return await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        id, "groupId", game, title, subtitle, "finishLabel", "variantLabel", "variantSuffix",
        lang, "isPaper", "releasedAt", "imageNormalUrl", "setCode", "setName", "collectorNumber", name,
        -- Very low score for fuzzy matches
        (${tokens.length * 10} + 
         CASE WHEN lang = 'en' THEN 1 ELSE 0 END +
         CASE WHEN "isPaper" THEN 1 ELSE 0 END) AS score
      FROM "public"."SearchIndex"
      WHERE game = ${game}
        AND "isPaper" = true
        AND (${langPref === 'all' ? Prisma.sql`true` : Prisma.sql`lang = 'en'`})
        AND (${Prisma.join(similarityConditions, ' AND ')})
      ORDER BY score DESC, "releasedAt" DESC NULLS LAST
      LIMIT ${limit}
    `
  )
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
    const variant = formatCardVariant({
      finishes: finishes || [],
      promoTypes: promoTypes || [],
      frameEffects: []
    })
    
    // Return the first finish-related tag, or null if none
    const finishTags = variant.tags.filter(tag => 
      tag === 'Foil' || tag === 'Etched' || tag.includes('Foil')
    )
    
    if (finishTags.length > 0) {
      return finishTags[0]
    }
    
    // Fallback to basic finishes
    const set = new Set(finishes || [])
    if (set.has('nonfoil')) return 'Nonfoil'
    if (set.has('foil')) return 'Foil'
    if (set.has('etched')) return 'Etched'
    return null
  }

  function variantFromTags(frameEffects: string[], promoTypes: string[], setCode: string, fullArt?: boolean | null): string | null {
    const variant = formatCardVariant({
      finishes: [],
      promoTypes: promoTypes || [],
      frameEffects: frameEffects || []
    })
    
    // Return the first frame effect tag, or null if none
    const frameTags = variant.tags.filter(tag => 
      !tag.includes('Foil') && tag !== 'Foil' && tag !== 'Etched'
    )
    
    if (frameTags.length > 0) {
      return frameTags[0]
    }
    
    // Fallback to legacy logic for special cases
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
    
    // Generate the complete variant suffix using formatCardVariant
    const variant = formatCardVariant({
      finishes: c.finishes || [],
      promoTypes: c.promoTypes || [],
      frameEffects: c.frameEffects || []
    })
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
      variantSuffix: variant.suffix || null,
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



