"use server"
import { prisma } from '@/lib/prisma'
import type { MtgCard } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { Readable } from 'stream'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import streamJson from 'stream-json'
import streamArrayMod from 'stream-json/streamers/StreamArray'
const { parser } = streamJson
const { withParser: streamArray } = streamArrayMod

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
const KV_KEY_CHECKPOINT = 'scryfall.default_cards.checkpoint'
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

  // Support optional file-based transform/ingest when a file path is provided via CLI flag
  const fromFileArg = process.argv.find((a) => a === '--from-file')
  const fromFilePath = fromFileArg ? process.argv[process.argv.indexOf(fromFileArg) + 1] : ''

  // Resume checkpoint if exists for this bulk
  let resumeIndex = -1
  try {
    const raw = await getKv(KV_KEY_CHECKPOINT)
    if (raw) {
      const parsed = JSON.parse(raw) as { updatedAt?: string; index?: number }
      if (parsed?.updatedAt === bulkUpdatedAt && typeof parsed?.index === 'number') {
        resumeIndex = parsed.index
      }
    }
  } catch {}

  const batchSize = DEFAULT_BATCH_SIZE
  const excludedSetTypes = new Set(
    (process.env.SCRYFALL_EXCLUDE_SET_TYPES ?? 'token,memorabilia,alchemy,minigame')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )

  const maxAttempts = Number(process.env.SCRYFALL_MAX_ATTEMPTS ?? 20)
  const baseDelayMs = 1_000

  // Transformer mode (from file): produce NDJSON parts and checkpoints; no DB writes
  if (fromFilePath) {
    const abs = path.resolve(fromFilePath)
    const isGz = abs.endsWith('.gz')
    const dataDir = path.resolve('data')
    const ndjsonDir = path.join(dataDir, 'ndjson')
    if (!fs.existsSync(ndjsonDir)) fs.mkdirSync(ndjsonDir, { recursive: true })
    const metaPath = path.join(dataDir, 'scryfall-download.meta.json')
    if (!fs.existsSync(metaPath)) {
      throw new Error('Missing data/scryfall-download.meta.json. Run scryfall:download first.')
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as { updatedAt: string; etag: string | null }

    const partSize = Number(process.env.NDJSON_PART_SIZE ?? 100_000)
    let lastPart = -1
    try {
      const raw = await getKv('scryfall:default:ndjson')
      if (raw) {
        const parsed = JSON.parse(raw) as { updatedAt?: string; etag?: string | null; lastPart?: number }
        if (parsed?.updatedAt === meta.updatedAt && parsed?.etag === meta.etag && typeof parsed?.lastPart === 'number') {
          lastPart = parsed.lastPart
        }
      }
    } catch {}

    console.log('[scryfall] Transforming to NDJSON parts from', abs)
    const fileStream = fs.createReadStream(abs)
    const inputStream = isGz ? fileStream.pipe(zlib.createGunzip()) : fileStream
    const pipeline = inputStream.pipe(parser()).pipe(streamArray())

    // Compute resume threshold by allowed-card count, not raw JSON index
    let allowedCount = (lastPart + 1) * partSize
    let currentPartIndex = Math.max(0, lastPart + 1)
    let currentPartPath = path.join(ndjsonDir, `part-${String(currentPartIndex).padStart(5, '0')}.ndjson`)
    let partStream: fs.WriteStream | null = null
    let writtenInPart = 0

    const openNextPart = () => {
      if (partStream) partStream.end()
      currentPartPath = path.join(ndjsonDir, `part-${String(currentPartIndex).padStart(5, '0')}.ndjson`)
      partStream = fs.createWriteStream(currentPartPath, { flags: 'a' })
      writtenInPart = 0
      console.log('[scryfall] Writing', path.basename(currentPartPath))
    }

    if (currentPartIndex >= 0) openNextPart()

    const mapToRow = (card: any) => {
      const priceUsd = card?.prices?.usd
      const priceUsdFoil = card?.prices?.usd_foil
      const priceUsdEtched = card?.prices?.usd_etched
      const priceEur = card?.prices?.eur
      const priceTix = card?.prices?.tix
      return {
        scryfallId: String(card.id),
        oracleId: String(card?.oracle_id ?? ''),
        name: String(card?.name ?? ''),
        setCode: String(card?.set ?? ''),
        // set name normalized into Set table
        collectorNumber: String(card?.collector_number ?? ''),
        rarity: card?.rarity ? String(card.rarity) : null,
        finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
        frameEffects: Array.isArray(card?.frame_effects) ? card.frame_effects.map((f: any) => String(f)) : [],
        promoTypes: Array.isArray(card?.promo_types) ? card.promo_types.map((p: any) => String(p)) : [],
        borderColor: card?.border_color ? String(card.border_color) : null,
        fullArt: Boolean(card?.full_art ?? false),
        legalitiesJson: card?.legalities ?? undefined,
        priceUsd: priceUsd ? String(priceUsd) : '',
        priceUsdFoil: priceUsdFoil ? String(priceUsdFoil) : '',
        priceUsdEtched: priceUsdEtched ? String(priceUsdEtched) : '',
        priceEur: priceEur ? String(priceEur) : '',
        priceTix: priceTix ? String(priceTix) : '',
        lang: String(card?.lang ?? 'en'),
        isPaper: true,
        setType: card?.set_type ? String(card.set_type) : null,
        releasedAt: card?.released_at ? new Date(card.released_at).toISOString() : '',
        scryfallUpdatedAt: card?.released_at ? new Date(card.released_at).toISOString() : new Date(meta.updatedAt).toISOString(),
      }
    }

    await new Promise<void>((resolve, reject) => {
      pipeline.on('data', (data: { key: number; value: any }) => {
        const card = data.value
        const isPaper = !card?.digital && Array.isArray(card?.games) && card.games.includes('paper')
        const isEnglish = card?.lang === 'en'
        const setType: string | undefined = card?.set_type
        const allowed = isPaper && isEnglish && (!setType || !excludedSetTypes.has(setType))
        if (!allowed) return
        if (allowedCount > 0) {
          allowedCount--
          return
        }
        const row = mapToRow(card)
        const line = JSON.stringify(row)
        if (!partStream) openNextPart()
        partStream!.write(line + '\n')
        writtenInPart++
        updatedCount++
        if (updatedCount % 10_000 === 0) {
          console.log(`[scryfall] Transformed ${updatedCount} rows`)
        }
        if (writtenInPart >= partSize) {
          // finish part
          partStream!.end()
          partStream = null
          // persist checkpoint for completed part
          prisma.kvMeta.upsert({
            where: { key: 'scryfall:default:ndjson' },
            update: { value: JSON.stringify({ updatedAt: meta.updatedAt, etag: meta.etag, lastPart: currentPartIndex }) },
            create: { key: 'scryfall:default:ndjson', value: JSON.stringify({ updatedAt: meta.updatedAt, etag: meta.etag, lastPart: currentPartIndex }) },
          }).catch(() => {})
          currentPartIndex++
          openNextPart()
        }
      })
      pipeline.on('end', async () => {
        try {
          if (partStream) partStream.end()
          await upsertKv('scryfall:default:ndjson', JSON.stringify({ updatedAt: meta.updatedAt, etag: meta.etag, lastPart: currentPartIndex }))
          resolve()
        } catch (e) {
          reject(e)
        }
      })
      pipeline.on('error', reject)
    })

    const durationMs = Date.now() - started
    console.log('[scryfall] Transform completed', { written: updatedCount, durationMs })
    return { updated: updatedCount, skipped: false, durationMs }
  }

  // We'll loop/retry the streaming block on failure, resuming from the last persisted index
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      let pipeline: any
      if (fromFilePath) {
        const abs = path.resolve(fromFilePath)
        console.log('[scryfall] Reading from file', abs)
        const fileStream = fs.createReadStream(abs)
        const isGz = abs.endsWith('.gz')
        const inputStream = isGz ? fileStream.pipe(zlib.createGunzip()) : fileStream
        pipeline = inputStream.pipe(parser()).pipe(streamArray())
      } else {
        console.log('[scryfall] Downloading bulk default_cards from', defaultCards.download_uri)
        const bulkResp = await fetch(defaultCards.download_uri, { cache: 'no-store' })
        if (!bulkResp.ok || !bulkResp.body) {
          throw new Error(`Failed to download bulk: ${bulkResp.status} ${bulkResp.statusText}`)
        }
        const nodeStream = Readable.fromWeb(bulkResp.body as any)
        pipeline = nodeStream.pipe(parser()).pipe(streamArray())
      }

      let batch: any[] = []
      let lastSeenKey = -1

      const processBatch = async (cards: any[]) => {
        if (cards.length === 0) return
        await prisma.$transaction(async (tx) => {
          for (const card of cards) {
            await upsertCardWithTx(tx, card, bulkUpdatedAt)
          }
        }, { timeout: 120_000 })
        updatedCount += cards.length
        console.log(`[scryfall] Upserted batch of ${cards.length}, total ${updatedCount}`)
        // Persist checkpoint after successful DB write
        await upsertKv(
          KV_KEY_CHECKPOINT,
          JSON.stringify({ updatedAt: bulkUpdatedAt, index: lastSeenKey })
        )
      }

      await new Promise<void>((resolve, reject) => {
        pipeline.on('data', async (data: { key: number; value: any }) => {
          lastSeenKey = data.key
          if (data.key <= resumeIndex) {
            return
          }
          const card = data.value
          const isPaper = !card?.digital && Array.isArray(card?.games) && card.games.includes('paper')
          const isEnglish = card?.lang === 'en'
          const setType: string | undefined = card?.set_type
          const allowed = isPaper && isEnglish && (!setType || !excludedSetTypes.has(setType))
          if (!allowed) return
          batch.push(card)
          if (batch.length >= batchSize) {
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

      // Completed successfully: mark bulk done and clear checkpoint
      await upsertKv(KV_KEY_UPDATED_AT, bulkUpdatedAt)
      await upsertKv(KV_KEY_CHECKPOINT, JSON.stringify({}))

      const durationMs = Date.now() - started
      console.log('[scryfall] Completed refresh', { updated: updatedCount, durationMs })
      return { updated: updatedCount, skipped: false, durationMs }
    } catch (err) {
      if (attempt >= maxAttempts) {
        throw err
      }
      const delay = baseDelayMs * Math.min(60, attempt * 2)
      console.warn(`[scryfall] Ingest failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`)
      await new Promise((r) => setTimeout(r, delay))
      // On retry, resume from the last persisted index (refresh from KV)
      try {
        const raw = await getKv(KV_KEY_CHECKPOINT)
        if (raw) {
          const parsed = JSON.parse(raw) as { updatedAt?: string; index?: number }
          if (parsed?.updatedAt === bulkUpdatedAt && typeof parsed?.index === 'number') {
            resumeIndex = parsed.index
          }
        }
      } catch {}
      continue
    }
  }

  // Should not reach
  const durationMs = Date.now() - started
  return { updated: updatedCount, skipped: false, durationMs }
}

// removed: image URL is computed on the fly from scryfallId

function upsertCardWithTx(tx: Prisma.TransactionClient, card: any, bulkUpdatedAt: string) {
  const priceUsd = card?.prices?.usd
  const priceUsdFoil = card?.prices?.usd_foil
  const priceUsdEtched = card?.prices?.usd_etched
  const priceEur = card?.prices?.eur
  const priceTix = card?.prices?.tix
  return tx.mtgCard.upsert({
    where: { scryfallId: String(card.id) },
    create: {
      scryfallId: String(card.id),
      oracleId: String(card?.oracle_id ?? ''),
      name: String(card.name ?? ''),
      setCode: String(card.set ?? ''),
      // set name normalized into Set table
      collectorNumber: String(card.collector_number ?? ''),
      rarity: card?.rarity ? String(card.rarity) : null,
      finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
      frameEffects: Array.isArray(card?.frame_effects) ? card.frame_effects.map((f: any) => String(f)) : [],
      promoTypes: Array.isArray(card?.promo_types) ? card.promo_types.map((p: any) => String(p)) : [],
      borderColor: card?.border_color ? String(card.border_color) : null,
      fullArt: Boolean(card?.full_art ?? false),
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
      // set name normalized into Set table
      collectorNumber: String(card.collector_number ?? ''),
      rarity: card?.rarity ? String(card.rarity) : null,
      finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
      frameEffects: Array.isArray(card?.frame_effects) ? card.frame_effects.map((f: any) => String(f)) : [],
      promoTypes: Array.isArray(card?.promo_types) ? card.promo_types.map((p: any) => String(p)) : [],
      borderColor: card?.border_color ? String(card.border_color) : null,
      fullArt: Boolean(card?.full_art ?? false),
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


