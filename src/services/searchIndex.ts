import { prisma } from '@/lib/prisma'
import { getScryfallNormalUrl } from '@/lib/images'
import { formatCardVariant } from '@/lib/cards/formatVariant'
import { formatDisplayName } from '@/lib/cardNames'

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

function shouldOverrideFinishToStandard(finishLabel: string | null, priceUsdFoil: number | null): boolean {
  if (!finishLabel) return false
  
  // List of special finishes that require priceUsdFoil to be valid
  const specialFinishes = [
    'Surge Foil', 'Etched', 'Halo', 'Gilded', 'Textured', 'Rainbow', 
    'Step-and-Compleat', 'Mana Foil', 'Serialized', 'Double Rainbow',
    'Surge Foil', 'Etched Foil', 'Halo Foil', 'Gilded Foil', 'Textured Foil'
  ]
  
  // Check if this is a special finish
  const isSpecialFinish = specialFinishes.some(finish => 
    finishLabel.toLowerCase().includes(finish.toLowerCase())
  )
  
  // If it's a special finish but no foil price, override to Standard
  return isSpecialFinish && !priceUsdFoil
}

function getOverriddenFinishLabel(originalFinishLabel: string | null, priceUsdFoil: number | null): string | null {
  if (shouldOverrideFinishToStandard(originalFinishLabel, priceUsdFoil)) {
    return 'Standard'
  }
  return originalFinishLabel
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
  
  // Fallback to Standard for basic finishes
  const hasBasicFinish = (finishes || []).some(f => f === 'nonfoil' || f === 'foil')
  return hasBasicFinish ? 'Standard' : null
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
  let reclassificationCount = 0

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
        flavorName: true,
        setCode: true,
        // we no longer require set relation here; use join later if needed
        collectorNumber: true,
        finishes: true,
        frameEffects: true,
        promoTypes: true,
        borderColor: true,
        fullArt: true,
        lang: true,
        isPaper: true,
        releasedAt: true,
        priceUsd: true,
        priceUsdFoil: true,
        priceUsdEtched: true,
      },
    })

    if (cards.length === 0) break

    const rows = cards.map((c) => {
      const title = formatDisplayName(c.name || '', c.flavorName)
      const originalFinishLabel = pickFinishLabel(c.finishes || [], c.promoTypes || [])
      const finishLabel = getOverriddenFinishLabel(originalFinishLabel, c.priceUsdFoil ? Number(c.priceUsdFoil) : null)
      
      // Log reclassifications for observability
      if (originalFinishLabel && finishLabel !== originalFinishLabel) {
        reclassificationCount++
        console.log(JSON.stringify({
          event: 'finish.reclassification',
          scryfallId: c.scryfallId,
          setCode: c.setCode,
          collectorNumber: c.collectorNumber,
          originalFinish: originalFinishLabel,
          overriddenFinish: finishLabel,
          reason: 'missing_priceUsdFoil',
          hasPriceUsd: !!c.priceUsd,
          hasPriceUsdFoil: !!c.priceUsdFoil
        }))
      }
      
      const variantLabel = variantFromTags(c.frameEffects || [], c.promoTypes || [], c.setCode, c.fullArt)
      
      // Generate the complete variant suffix using formatCardVariant
      const variant = formatCardVariant({
        finishes: c.finishes || [],
        promoTypes: c.promoTypes || [],
        frameEffects: c.frameEffects || [],
        borderColor: c.borderColor
      })
      
      // Override variant suffix if finish was reclassified to Standard
      let variantSuffix = variant.suffix
      if (finishLabel === 'Standard' && originalFinishLabel && originalFinishLabel !== 'Standard') {
        // Remove special finish references from the suffix
        const specialFinishPatterns = [
          /\(Surge Foil\)/gi,
          /\(Etched\)/gi,
          /\(Halo\)/gi,
          /\(Gilded\)/gi,
          /\(Textured\)/gi,
          /\(Rainbow\)/gi,
          /\(Step-and-Compleat\)/gi,
          /\(Mana Foil\)/gi,
          /\(Serialized\)/gi,
          /\(Double Rainbow\)/gi,
          /\(Etched Foil\)/gi,
          /\(Halo Foil\)/gi,
          /\(Gilded Foil\)/gi,
          /\(Textured Foil\)/gi
        ]
        
        variantSuffix = specialFinishPatterns.reduce((suffix, pattern) => {
          return suffix.replace(pattern, '').trim()
        }, variant.suffix)
        
        // Clean up any double spaces or trailing/leading spaces
        variantSuffix = variantSuffix.replace(/\s+/g, ' ').trim()
      }
      
      const subtitle = buildSubtitle(c.setCode, null, c.collectorNumber)
      const keywordsText = buildKeywords({
        name: title,
        setCode: c.setCode,
        setName: null,
        collectorNumber: c.collectorNumber,
        frameEffects: c.frameEffects,
        promoTypes: c.promoTypes,
      })
      // Compute a lightweight sort score preferring newer printings
      const recency = c.releasedAt ? c.releasedAt.getTime() / 1_000_000_000 : 0
      const finishPref = finishLabel === 'Nonfoil' ? 1.0 : finishLabel === 'Foil' ? 0.9 : finishLabel ? 0.8 : 0.5
      const sortScore = recency + finishPref
      // Generate precomputed sort keys
      const fullDisplayName = title + (variant.suffix || '')
      const nameSortKey = fullDisplayName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      return {
        id: c.scryfallId,
        groupId: c.oracleId,
        game: 'mtg',
        title: title,
        subtitle,
        keywordsText,
        finishLabel: finishLabel ?? null,
        variantLabel: variantLabel ?? null,
        variantSuffix: variantSuffix,
        lang: c.lang,
        isPaper: Boolean(c.isPaper),
        releasedAt: c.releasedAt ?? null,
        sortScore,
        setCode: c.setCode,
        setName: null,
        collectorNumber: c.collectorNumber,
        imageNormalUrl: c.scryfallId ? getScryfallNormalUrl(c.scryfallId) : null,
        name: title,
        nameSortKey: nameSortKey,
        nameSortKeyDesc: nameSortKey, // Same key, will be sorted DESC in queries
      }
    })

    if (rows.length) {
      const inserted = await withRetries(() => prisma.searchIndex.createMany({ data: rows, skipDuplicates: true }))
      totalInserted += (inserted as any).count ?? 0
    }

    skip += cards.length
  }

  // Log totals after rebuild
  const totalRows = await prisma.searchIndex.count()
  const withSuffix = await prisma.searchIndex.count({
    where: {
      AND: [
        { variantSuffix: { not: null } },
        { variantSuffix: { not: '' } }
      ]
    }
  })
  
  console.log(`[rebuildSearchIndex] Total rows: ${totalRows}, With suffix: ${withSuffix}`)
  
  // Log reclassification metrics
  if (reclassificationCount > 0) {
    console.log(JSON.stringify({
      event: 'finish.reclassification.metrics',
      totalReclassified: reclassificationCount,
      totalRows: totalRows,
      reclassificationRate: (reclassificationCount / totalRows * 100).toFixed(2) + '%'
    }))
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


