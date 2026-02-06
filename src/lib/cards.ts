import { prisma } from './prisma'
import { subDays } from 'date-fns'

export interface MostExpensiveRecentCard {
  id: string
  name: string
  setCode: string
  setName: string
  imageUrl: string
  priceUsd: number
  priceChange24h?: number | null
  priceChange7d?: number | null
}

/**
 * Fetch the most expensive cards created within the last N days.
 * Results are ordered by priceUsd DESC, then createdAt DESC.
 */
export async function getMostExpensiveRecentCards(
  limit: number = 10,
  days: number = 60
): Promise<MostExpensiveRecentCard[]> {
  const cutoffDate = subDays(new Date(), days)

  const cards = await prisma.mtgCard.findMany({
    where: {
      createdAt: {
        gte: cutoffDate,
      },
      priceUsd: {
        not: null,
        gt: 0,
      },
      isPaper: true,
      lang: 'en',
    },
    include: {
      set: {
        select: {
          set_name: true,
        },
      },
    },
    orderBy: [
      { priceUsd: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  })

  return cards.map((card) => ({
    id: card.scryfallId,
    name: card.name,
    setCode: card.setCode,
    setName: card.set.set_name || card.setCode,
    imageUrl: `https://cards.scryfall.io/normal/front/${card.scryfallId[0]}/${card.scryfallId[1]}/${card.scryfallId}.jpg`,
    priceUsd: Number(card.priceUsd),
    priceChange24h: null,
    priceChange7d: null,
  }))
}
