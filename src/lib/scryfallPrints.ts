import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type TopUpResult = { inserted: number; updated: number }

const EXCLUDED_DEFAULT = 'token,memorabilia,alchemy,minigame'
const BATCH_SIZE = Number(process.env.SCRYFALL_TOPUP_BATCH_SIZE || 200)

function parseExcluded(): Set<string> {
  return new Set(
    (process.env.SCRYFALL_EXCLUDE_SET_TYPES ?? EXCLUDED_DEFAULT)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
}

function shouldKeep(card: any, excluded: Set<string>): boolean {
  const isPaper = !card?.digital && Array.isArray(card?.games) && card.games.includes('paper')
  const isEnglish = card?.lang === 'en'
  const type: string | undefined = card?.set_type
  return isPaper && isEnglish && (!type || !excluded.has(type))
}

function pickImageNormalUrl(card: any): string | null {
  const imageNormal = card?.image_uris?.normal
  if (typeof imageNormal === 'string') return imageNormal
  const firstFace = Array.isArray(card?.card_faces) ? card.card_faces[0] : undefined
  const faceImage = firstFace?.image_uris?.normal
  if (typeof faceImage === 'string') return faceImage
  return null
}

function mapToDb(card: any, bulkUpdatedAt: string | null) {
  const priceUsd = card?.prices?.usd
  const priceUsdFoil = card?.prices?.usd_foil
  const priceUsdEtched = card?.prices?.usd_etched
  const priceEur = card?.prices?.eur
  const priceTix = card?.prices?.tix
  return {
    scryfallId: String(card.id),
    oracleId: String(card?.oracle_id ?? ''),
    name: String(card.name ?? ''),
    setCode: String(card.set ?? ''),
    setName: card?.set_name ? String(card.set_name) : null,
    collectorNumber: String(card.collector_number ?? ''),
    rarity: card?.rarity ? String(card.rarity) : null,
    finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
    frameEffects: Array.isArray(card?.frame_effects) ? card.frame_effects.map((f: any) => String(f)) : [],
    promoTypes: Array.isArray(card?.promo_types) ? card.promo_types.map((p: any) => String(p)) : [],
    borderColor: card?.border_color ? String(card.border_color) : null,
    fullArt: Boolean(card?.full_art ?? false),
    imageNormalUrl: pickImageNormalUrl(card),
    legalitiesJson: card?.legalities ?? undefined,
    priceUsd: priceUsd ? new Prisma.Decimal(String(priceUsd)) : null,
    priceUsdFoil: priceUsdFoil ? new Prisma.Decimal(String(priceUsdFoil)) : null,
    priceUsdEtched: priceUsdEtched ? new Prisma.Decimal(String(priceUsdEtched)) : null,
    // keep EUR/TIX mapping around (not used on UI)
    priceEur: priceEur ? String(priceEur) : null,
    priceTix: priceTix ? String(priceTix) : null,
    lang: String(card?.lang ?? 'en'),
    isPaper: true,
    setType: card?.set_type ? String(card.set_type) : null,
    releasedAt: card?.released_at ? new Date(card.released_at) : null,
    scryfallUpdatedAt: card?.released_at ? new Date(card.released_at) : bulkUpdatedAt ? new Date(bulkUpdatedAt) : null,
  }
}

export async function fetchPrintsForOracle(oracleId: string): Promise<TopUpResult> {
  const excluded = parseExcluded()
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`oracleid:${oracleId}`)}`
  let inserted = 0
  let updated = 0

  while (url) {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Scryfall search failed: ${res.status} ${res.statusText}`)
    const json = await res.json() as any
    const data: any[] = Array.isArray(json?.data) ? json.data : []

    // filter
    const filtered = data.filter((c) => shouldKeep(c, excluded))

    // process in batches
    for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
      const chunk = filtered.slice(i, i + BATCH_SIZE)
      const ids = chunk.map((c) => String(c.id))
      const existing = await prisma.mtgCard.findMany({
        where: { scryfallId: { in: ids } },
        select: { scryfallId: true },
      })
      const existingSet = new Set(existing.map((e) => e.scryfallId))
      const mapped = chunk.map((c) => mapToDb(c, json?.updated_at ?? null))

      const ops = mapped.map((m) =>
        prisma.mtgCard.upsert({ where: { scryfallId: m.scryfallId }, create: m, update: m })
      )
      await prisma.$transaction(ops, { timeout: 120_000 })

      const createdCount = mapped.filter((m) => !existingSet.has(m.scryfallId)).length
      inserted += createdCount
      updated += mapped.length - createdCount
    }

    url = json?.has_more ? (json?.next_page as string) : ''
  }

  return { inserted, updated }
}

// Best-effort lock using KvMeta updatedAt as freshness signal
const LOCK_PREFIX = 'prints-sync.lock.'
const LOCK_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function tryWithOracleLock<T>(oracleId: string, fn: () => Promise<T>): Promise<T | null> {
  const key = `${LOCK_PREFIX}${oracleId}`
  const now = Date.now()
  const row = await prisma.kvMeta.findUnique({ where: { key } })
  if (row && Date.now() - new Date(row.updatedAt).getTime() < LOCK_TTL_MS) {
    return null
  }
  await prisma.kvMeta.upsert({ where: { key }, update: { value: String(now) }, create: { key, value: String(now) } })
  try {
    const result = await fn()
    await prisma.kvMeta.update({ where: { key }, data: { value: String(Date.now()) } })
    return result
  } catch (e) {
    return null
  }
}



