import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const SCRYFALL_SEARCH_URL = 'https://api.scryfall.com/cards/search'

type ScryfallCard = {
  id: string
  oracle_id: string
  name: string
  flavor_name?: string
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

    // Ensure Set exists first
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

    // Create the card
    await prisma.mtgCard.create({
      data: {
        scryfallId: String(card.id),
        oracleId: card.oracle_id || "",
        name: card.name,
        flavorName: card.flavor_name || null,
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
  } catch (error) {
    console.warn('[scryfall] Failed to create card:', card.id, error)
    return false
  }
}

async function catchUpMissingCards() {
  const started = Date.now()
  let importedCount = 0

  try {
    console.log('[scryfall] Starting catch-up for missing cards')

    // Search for cards released in the last 7 days that might be missing
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const baseQuery = `game:paper lang:en -is:digital -set:minigame -set:token -set:memorabilia -set:alchemy`
    const query = `released>=${sevenDaysAgo} ${baseQuery}`
    let url = `${SCRYFALL_SEARCH_URL}?q=${encodeURIComponent(query)}&order=released`

    console.log('[scryfall] Searching for cards released since:', sevenDaysAgo)

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
        // Check if card already exists
        const exists = await prisma.mtgCard.findUnique({
          where: { scryfallId: String(card.id) },
          select: { scryfallId: true }
        })
        
        if (!exists) {
          console.log(`[scryfall] Importing missing card: ${card.name} (${card.set})`)
          const imported = await upsertCard(card)
          if (imported) importedCount++
        }
      }

      // Get next page URL if any
      url = result.has_more ? result.next_page! : ''

      // Rate limiting: Sleep 100ms between pages
      if (url) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const durationMs = Date.now() - started
    console.log(`[scryfall] Catch-up completed: ${importedCount} cards imported in ${durationMs}ms`)
    
  } catch (error) {
    console.error('[scryfall] Catch-up failed:', error)
    throw error
  }
}

catchUpMissingCards()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
