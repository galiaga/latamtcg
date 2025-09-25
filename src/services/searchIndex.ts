import { prisma } from '@/lib/prisma'

function normalizeForKeywords(input: string): string {
  if (!input) return ''
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9#:\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickFinishLabel(finishes: string[], promoTypes: string[]): string | null {
  const types = new Set((promoTypes || []).map((t) => String(t)))
  // Special foils first
  if (types.has('gilded')) return 'Gilded Foil'
  if (types.has('halo-foil')) return 'Halo Foil'
  if (types.has('textured')) return 'Textured Foil'
  if (types.has('step-and-compleat')) return 'Step-and-Compleat'
  if (types.has('rainbow-foil')) return 'Rainbow Foil'
  const set = new Set(finishes || [])
  if (set.has('etched')) return 'Foil Etched'
  // Standard (nonfoil/foil) collapse later in UI; mark as Standard for grouping
  if (set.has('nonfoil') || set.has('foil')) return 'Standard'
  return null
}

function variantFromTags(frameEffects: string[], promoTypes: string[], setCode: string, fullArt?: boolean | null): string | null {
  const fe = new Set(frameEffects || [])
  const pt = new Set(promoTypes || [])
  if (fe.has('borderless')) return 'Borderless'
  if (fe.has('extendedart')) return 'Extended Art'
  if (fe.has('showcase')) return 'Showcase'
  if (fe.has('shatteredglass')) return 'Shattered Glass'
  if (pt.has('retro') || pt.has('retro-frame')) return 'Retro'
  if (fullArt) return 'Borderless'
  if ((setCode || '').toLowerCase() === 'plst') return 'The List'
  // Common short codes that should surface as variant markers
  const code = (setCode || '').toUpperCase()
  if (code === 'J18') return 'J18'
  return null
}

function buildSubtitle(setCode: string, setName: string | null, collectorNumber: string): string {
  const parts = [String(setCode || '').toUpperCase()]
  if (setName) parts.push(setName)
  if (collectorNumber) parts.push(`#${collectorNumber}`)
  return parts.join(' • ')
}

function buildKeywords(row: any): string {
  const words: string[] = []
  const push = (v: any) => {
    if (!v) return
    if (Array.isArray(v)) {
      v.forEach((x) => push(String(x)))
    } else {
      words.push(String(v))
    }
  }
  push(row.name)
  push(row.setCode)
  push(row.setName)
  push(row.collectorNumber)
  push(row.frameEffects)
  push(row.promoTypes)
  if ((row.setCode || '').toLowerCase() === 'plst') push('the list')
  return normalizeForKeywords(words.join(' '))
}

export async function rebuildSearchIndex(): Promise<{ inserted: number }>
{
  const languages: 'en' | 'all' = (process.env.SEARCH_LANGS === 'all' ? 'all' : 'en')
  const where: any = {
    isPaper: true,
  }
  if (languages !== 'all') {
    where.lang = 'en'
  }

  // Stream in chunks to avoid loading entire table
  const pageSize = 2000
  let skip = 0
  let totalInserted = 0

  // Clear existing index for the selected language scope to avoid duplicates
  await withRetries(async () => {
    try {
      await prisma.searchIndex.deleteMany({ where: languages === 'all' ? {} : { lang: 'en' } })
    } catch (err: any) {
      const message = String(err?.message || '')
      if (message.includes('does not exist')) {
        // Table missing; nothing to clear
        return
      }
      throw err
    }
  })

  for (;;) {
    const cards = await prisma.mtgCard.findMany({
      where,
      orderBy: { id: 'asc' },
      skip,
      take: pageSize,
      select: {
        scryfallId: true,
        oracleId: true,
        name: true,
        setCode: true,
        setName: true,
        collectorNumber: true,
        finishes: true,
        frameEffects: true,
        promoTypes: true,
        fullArt: true,
        lang: true,
        isPaper: true,
        releasedAt: true,
        imageNormalUrl: true,
      },
    })

    if (cards.length === 0) break

    const rows = cards.map((c) => {
      const title = String(c.name || '').replace(/\(Full Art\)/gi, '(Borderless)')
      const finishLabel = pickFinishLabel(c.finishes || [], c.promoTypes || [])
      const variantLabel = variantFromTags(c.frameEffects || [], c.promoTypes || [], c.setCode, c.fullArt)
      const subtitle = buildSubtitle(c.setCode, c.setName ?? null, c.collectorNumber)
      const keywordsText = buildKeywords({
        name: title,
        setCode: c.setCode,
        setName: c.setName,
        collectorNumber: c.collectorNumber,
        frameEffects: c.frameEffects,
        promoTypes: c.promoTypes,
      })
      // Compute a lightweight sort score preferring newer printings
      const recency = c.releasedAt ? c.releasedAt.getTime() / 1_000_000_000 : 0
      const finishPref = finishLabel === 'Nonfoil' ? 1.0 : finishLabel === 'Foil' ? 0.9 : finishLabel ? 0.8 : 0.5
      const sortScore = recency + finishPref
      return {
        id: c.scryfallId,
        groupId: c.oracleId,
        game: 'mtg',
        title: title,
        subtitle,
        keywordsText,
        finishLabel: finishLabel ?? null,
        variantLabel: variantLabel ?? null,
        lang: c.lang,
        isPaper: Boolean(c.isPaper),
        releasedAt: c.releasedAt ?? null,
        sortScore,
        setCode: c.setCode,
        setName: c.setName ?? null,
        collectorNumber: c.collectorNumber,
        imageNormalUrl: c.imageNormalUrl ?? null,
        name: title,
      }
    })

    if (rows.length) {
      const inserted = await withRetries(() => prisma.searchIndex.createMany({ data: rows, skipDuplicates: true }))
      totalInserted += (inserted as any).count ?? 0
    }

    skip += cards.length
  }

  return { inserted: totalInserted }
}

async function withRetries<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 300): Promise<T> {
  let lastErr: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      const msg = String(err?.message || '')
      // Retry common transient errors
      if (msg.includes("Can't reach database server") || msg.includes('ECONN') || msg.includes('read ECONNRESET') || msg.includes('terminated')) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)))
        continue
      }
      throw err
    }
  }
  throw lastErr
}


