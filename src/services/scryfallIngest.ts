import { prisma } from '@/lib/prisma'
import type { MtgCard } from '@prisma/client'
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

  const processBatch = async (cards: any[]) => {
    if (cards.length === 0) return
    const operations = cards.map((card) => {
      const mapped = mapCard(card, bulkUpdatedAt)
      return prisma.mtgCard.upsert({
        where: { scryfallId: mapped.scryfallId },
        create: mapped,
        update: mapped,
      })
    })
    await prisma.$transaction(operations, { timeout: 120_000 })
    updatedCount += cards.length
    console.log(`[scryfall] Upserted batch of ${cards.length}, total ${updatedCount}`)
  }

  await new Promise<void>((resolve, reject) => {
    pipeline.on('data', async (data: { key: number; value: any }) => {
      batch.push(data.value)
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

function mapCard(card: any, bulkUpdatedAt: string): Omit<MtgCard, 'id' | 'updatedAt' | 'createdAt'> {
  const priceUsd = card?.prices?.usd ?? null
  const priceUsdFoil = card?.prices?.usd_foil ?? null
  const priceEur = card?.prices?.eur ?? null
  const priceTix = card?.prices?.tix ?? null

  return {
    scryfallId: String(card.id),
    name: String(card.name ?? ''),
    setCode: String(card.set ?? ''),
    collectorNumber: String(card.collector_number ?? ''),
    rarity: card?.rarity ? String(card.rarity) : null,
    finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
    imageNormalUrl: pickImageNormalUrl(card) ?? null,
    legalitiesJson: card?.legalities ?? null,
    priceUsd: priceUsd !== null ? String(priceUsd) : null,
    priceUsdFoil: priceUsdFoil !== null ? String(priceUsdFoil) : null,
    priceEur: priceEur !== null ? String(priceEur) : null,
    priceTix: priceTix !== null ? String(priceTix) : null,
    scryfallUpdatedAt: new Date(bulkUpdatedAt),
  }
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


