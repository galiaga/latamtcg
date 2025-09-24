import { prisma } from '@/lib/prisma'
import type { MtgCard } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { Readable } from 'stream'
import { parser } from 'stream-json'
import { streamArray } from 'stream-json/streamers/StreamArray'

type IngestSummary = {
  updated: number
  skipped: boolean
  durationMs: number
}

type BulkMeta = {
  id: string
  type: string
  updated_at: string
  download_uri: string
}

const BULK_INDEX_URL = 'https://api.scryfall.com/bulk-data'
const KV_KEY_UPDATED_AT = 'scryfall.default_cards.updated_at'
const DEFAULT_BATCH_SIZE = Number(process.env.SCRYFALL_BATCH_SIZE || 500)

export async function runScryfallRefresh(): Promise<IngestSummary> {
  const started = Date.now()
  let updatedCount = 0

  console.log('[scryfall] Starting refresh job')
  const bulkIndex = await fetch(BULK_INDEX_URL, { cache: 'no-store' })
  if (!bulkIndex.ok) {
    throw new Error(`Failed to fetch bulk index: ${bulkIndex.status} ${bulkIndex.statusText}`)
  }
  const bulkJson = await bulkIndex.json() as { data: BulkMeta[] }
  const defaultCards = bulkJson.data.find((b) => b.type === 'default_cards')
  if (!defaultCards) {
    throw new Error('Could not find default_cards entry in Scryfall bulk-data')
  }

  const bulkUpdatedAt = defaultCards.updated_at
  const lastSeen = await getKv(KV_KEY_UPDATED_AT)
  if (lastSeen && lastSeen === bulkUpdatedAt) {
    console.log('[scryfall] Bulk is unchanged; skipping work')
    return { updated: 0, skipped: true, durationMs: Date.now() - started }
  }

  console.log('[scryfall] Downloading bulk default_cards from', defaultCards.download_uri)
  const bulkResp = await fetch(defaultCards.download_uri, {
    cache: 'no-store',
    // node fetch auto-decompresses gzip/deflate
  })
  if (!bulkResp.ok || !bulkResp.body) {
    throw new Error(`Failed to download bulk: ${bulkResp.status} ${bulkResp.statusText}`)
  }

  const nodeStream = Readable.fromWeb(bulkResp.body as any)

  // Scryfall default_cards is a JSON array of card objects; stream and process one by one
  const pipeline = nodeStream.pipe(parser()).pipe(streamArray())

  const batchSize = DEFAULT_BATCH_SIZE
  let batch: any[] = []
  const excludedSetTypes = new Set(
    (process.env.SCRYFALL_EXCLUDE_SET_TYPES ?? 'token,memorabilia,alchemy,minigame')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )

  const processBatch = async (cards: any[]) => {
    if (cards.length === 0) return
    const operations = cards.map((card) => upsertCard(card, bulkUpdatedAt))
    await prisma.$transaction(operations, { timeout: 120_000 })
    updatedCount += cards.length
    console.log(`[scryfall] Upserted batch of ${cards.length}, total ${updatedCount}`)
  }

  await new Promise<void>((resolve, reject) => {
    pipeline.on('data', async (data: { key: number; value: any }) => {
      const card = data.value
      const isPaper = !card?.digital && Array.isArray(card?.games) && card.games.includes('paper')
      const isEnglish = card?.lang === 'en'
      const setType: string | undefined = card?.set_type
      const allowed = isPaper && isEnglish && (!setType || !excludedSetTypes.has(setType))
      if (!allowed) return
      batch.push(card)
      if (batch.length >= batchSize) {
        // Pause the stream while we process
        pipeline.pause()
        processBatch(batch)
          .then(() => {
            batch = []
            pipeline.resume()
          })
          .catch(reject)
      }
    })
    pipeline.on('end', async () => {
      try {
        await processBatch(batch)
        resolve()
      } catch (err) {
        reject(err)
      }
    })
    pipeline.on('error', reject)
  })

  await upsertKv(KV_KEY_UPDATED_AT, bulkUpdatedAt)

  const durationMs = Date.now() - started
  console.log('[scryfall] Completed refresh', { updated: updatedCount, durationMs })
  return { updated: updatedCount, skipped: false, durationMs }
}

function pickImageNormalUrl(card: any): string | undefined {
  const imageNormal = card?.image_uris?.normal
  if (typeof imageNormal === 'string') return imageNormal
  const firstFace = Array.isArray(card?.card_faces) ? card.card_faces[0] : undefined
  const faceImage = firstFace?.image_uris?.normal
  if (typeof faceImage === 'string') return faceImage
  return undefined
}

function upsertCard(card: any, bulkUpdatedAt: string) {
  const priceUsd = card?.prices?.usd
  const priceUsdFoil = card?.prices?.usd_foil
  const priceUsdEtched = card?.prices?.usd_etched
  const priceEur = card?.prices?.eur
  const priceTix = card?.prices?.tix
  const imageUrl = pickImageNormalUrl(card) ?? null

  return prisma.mtgCard.upsert({
    where: { scryfallId: String(card.id) },
    create: {
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
      imageNormalUrl: imageUrl,
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
      scryfallUpdatedAt: card?.released_at ? new Date(card.released_at) : new Date(bulkUpdatedAt),
    },
    update: {
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
      imageNormalUrl: imageUrl,
      legalitiesJson: card?.legalities ?? undefined,
      priceUsd: priceUsd ? new Prisma.Decimal(String(priceUsd)) : null,
      priceUsdFoil: priceUsdFoil ? new Prisma.Decimal(String(priceUsdFoil)) : null,
      priceUsdEtched: priceUsdEtched ? new Prisma.Decimal(String(priceUsdEtched)) : null,
      priceEur: priceEur ? String(priceEur) : null,
      priceTix: priceTix ? String(priceTix) : null,
      lang: String(card?.lang ?? 'en'),
      isPaper: true,
      setType: card?.set_type ? String(card.set_type) : null,
      releasedAt: card?.released_at ? new Date(card.released_at) : null,
      scryfallUpdatedAt: card?.released_at ? new Date(card.released_at) : new Date(bulkUpdatedAt),
    },
  })
}

async function getKv(key: string): Promise<string | null> {
  const row = await prisma.kvMeta.findUnique({ where: { key } })
  return row?.value ?? null
}

async function upsertKv(key: string, value: string): Promise<void> {
  await prisma.kvMeta.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}


