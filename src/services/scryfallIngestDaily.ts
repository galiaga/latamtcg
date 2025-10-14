"use server"
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const SCRYFALL_SEARCH_URL = 'https://api.scryfall.com/cards/search'
const KV_KEY_LAST_UPDATE = 'scryfall.daily_update.last_run'

type DailyUpdateSummary = {
  updated: number
  skipped: boolean
  durationMs: number
}

type ScryfallCard = {
  id: string
  oracle_id: string
  name: string
  set: string
  set_name?: string
  collector_number: string
  rarity?: string
  finishes?: string[]
  frame_effects?: string[]
  promo_types?: string[]
  border_color?: string
  full_art?: boolean
  legalities?: any
  prices: {
    usd?: string | null
    usd_foil?: string | null
    usd_etched?: string | null
  }
  lang?: string
  set_type?: string
  released_at?: string
  updated_at?: string
}

type SearchResponse = {
  data: ScryfallCard[]
  has_more: boolean
  next_page?: string
  total_cards: number
}

async function upsertCard(card: ScryfallCard): Promise<boolean> {
  try {
    const priceUsd = card.prices.usd ? Number(card.prices.usd) : null
    const priceUsdFoil = card.prices.usd_foil ? Number(card.prices.usd_foil) : null
    const priceUsdEtched = card.prices.usd_etched ? Number(card.prices.usd_etched) : null

    // Fetch current prices to check for changes
    const prev = await prisma.mtgCard.findUnique({
      where: { scryfallId: String(card.id) },
      select: { priceUsd: true, priceUsdFoil: true, priceUsdEtched: true }
    })

    const usdChanged = priceUsd !== (prev?.priceUsd ? Number(prev.priceUsd) : null)
    const foilChanged = priceUsdFoil !== (prev?.priceUsdFoil ? Number(prev.priceUsdFoil) : null)
    const etchedChanged = priceUsdEtched !== (prev?.priceUsdEtched ? Number(prev.priceUsdEtched) : null)

    if (!prev) {
      // Card doesn't exist yet, ensure Set exists first
      await prisma.set.upsert({
        where: { set_code: card.set },
        create: {
          set_code: card.set,
          set_name: card.set_name || card.set,
          set_type: card.set_type,
          released_at: card.released_at ? new Date(card.released_at) : null
        },
        update: {} // Don't update if exists
      })

      // Now create the card
      await prisma.mtgCard.create({
        data: {
          scryfallId: String(card.id),
          oracleId: card.oracle_id || "",
          name: card.name,
          setCode: card.set || "",
          collectorNumber: String(card.collector_number || ""),
          rarity: card.rarity || null,
          finishes: Array.isArray(card.finishes) ? card.finishes : [],
          frameEffects: Array.isArray(card.frame_effects) ? card.frame_effects : [],
          promoTypes: Array.isArray(card.promo_types) ? card.promo_types : [],
          borderColor: card.border_color || null,
          fullArt: Boolean(card.full_art || false),
          legalitiesJson: card.legalities || {},
          priceUsd: priceUsd ? new Prisma.Decimal(String(priceUsd)) : null,
          priceUsdFoil: priceUsdFoil ? new Prisma.Decimal(String(priceUsdFoil)) : null,
          priceUsdEtched: priceUsdEtched ? new Prisma.Decimal(String(priceUsdEtched)) : null,
          priceUpdatedAt: new Date(),
          lang: card.lang || "en",
          isPaper: true,
          setType: card.set_type || null,
          releasedAt: card.released_at ? new Date(card.released_at) : null,
          scryfallUpdatedAt: card.updated_at ? new Date(card.updated_at) : null
        }
      })
      return true
    }

    if (!usdChanged && !foilChanged && !etchedChanged) {
      return false
    }

    // Update prices and record history in a transaction
    await prisma.$transaction(async (tx) => {
      // Update current prices
      await tx.mtgCard.update({
        where: { scryfallId: String(card.id) },
        data: {
          priceUsd: priceUsd ? new Prisma.Decimal(String(priceUsd)) : null,
          priceUsdFoil: priceUsdFoil ? new Prisma.Decimal(String(priceUsdFoil)) : null,
          priceUsdEtched: priceUsdEtched ? new Prisma.Decimal(String(priceUsdEtched)) : null,
          priceUpdatedAt: new Date()
        }
      })

      // Record price history for changed prices
      const now = new Date()
      const priceDay = now.toISOString().slice(0, 10)

      if (usdChanged && priceUsd !== null) {
          await tx.$executeRawUnsafe(
            'INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day) VALUES ($1::uuid, $2, $3, $4, $5::date) ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE SET price = EXCLUDED.price',
            String(card.id), 'normal', priceUsd, now, priceDay
          )
      }

      if (foilChanged && priceUsdFoil !== null) {
        await tx.$executeRawUnsafe(
          'INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day) VALUES ($1::uuid, $2, $3, $4, $5::date) ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE SET price = EXCLUDED.price',
          String(card.id), 'foil', priceUsdFoil, now, priceDay
        )
      }

      if (etchedChanged && priceUsdEtched !== null) {
        await tx.$executeRawUnsafe(
          'INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, price_day) VALUES ($1::uuid, $2, $3, $4, $5::date) ON CONFLICT (scryfall_id, finish, price_day) DO UPDATE SET price = EXCLUDED.price',
          String(card.id), 'etched', priceUsdEtched, now, priceDay
        )
      }
    })

    return true
  } catch (error) {
    console.warn('[scryfall] Failed to update card:', card.id, error)
    return false
  }
}

export async function runDailyPriceUpdate(): Promise<DailyUpdateSummary> {
  const started = Date.now()
  let updatedCount = 0

  try {
    console.log('[scryfall] Starting daily price update')

    // Get last update time
    const lastUpdate = await prisma.kvMeta.findUnique({
      where: { key: KV_KEY_LAST_UPDATE },
      select: { value: true }
    })

    // Search for cards updated in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const searchDate = lastUpdate?.value 
      ? new Date(lastUpdate.value).toISOString().split('T')[0]
      : yesterday.toISOString().split('T')[0]

    const query = `date>=${searchDate} game:paper lang:en -is:digital -set:minigame -set:token -set:memorabilia -set:alchemy`
    let url = `${SCRYFALL_SEARCH_URL}?q=${encodeURIComponent(query)}&order=updated`

    while (url) {
      console.log('[scryfall] Fetching page:', url)
      const response = await fetch(url, { 
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch cards: ${response.status} ${response.statusText}`)
      }

      const result = await response.json() as SearchResponse
      console.log(`[scryfall] Processing ${result.data.length} cards`)

      for (const card of result.data) {
        const updated = await upsertCard(card)
        if (updated) updatedCount++
      }

      // Get next page URL if any
      url = result.has_more ? result.next_page! : ''

      // Rate limiting: Sleep 50ms between pages to respect Scryfall's rate limits
      if (url) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    // Update last run timestamp
    await prisma.kvMeta.upsert({
      where: { key: KV_KEY_LAST_UPDATE },
      create: { key: KV_KEY_LAST_UPDATE, value: new Date().toISOString() },
      update: { value: new Date().toISOString() }
    })

    console.log(`[scryfall] Daily update completed: ${updatedCount} prices updated`)
    return {
      updated: updatedCount,
      skipped: false,
      durationMs: Date.now() - started
    }

  } catch (error) {
    console.error('[scryfall] Daily update failed:', error)
    throw error
  }
}
