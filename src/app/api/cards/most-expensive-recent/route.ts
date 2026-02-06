import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'

export interface CardPreview {
  id: string
  name: string
  setCode: string
  setName: string
  imageUrl: string
  priceUsd: number
  priceChange24h?: number | null
  priceChange7d?: number | null
}

export interface MostExpensiveRecentCardsResponse {
  cards: CardPreview[]
}

export async function GET(req: NextRequest) {
  try {
    const t0 = Date.now()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(20, Math.max(1, parseInt(String(searchParams.get('limit') || '10'), 10) || 10))
    const days = Math.min(365, Math.max(1, parseInt(String(searchParams.get('days') || '60'), 10) || 60))

    // Calculate cutoff date
    const cutoffDate = subDays(new Date(), days)

    // Query cards created in the last N days with pricing
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

    // Format response
    const formattedCards: CardPreview[] = cards.map((card) => ({
      id: card.scryfallId,
      name: card.name,
      setCode: card.setCode,
      setName: card.set.set_name || card.setCode,
      imageUrl: `https://cards.scryfall.io/normal/front/${card.scryfallId[0]}/${card.scryfallId[1]}/${card.scryfallId}.jpg`,
      priceUsd: Number(card.priceUsd),
      priceChange24h: null, // Not available in current schema
      priceChange7d: null, // Not available in current schema
    }))

    const t1 = Date.now()
    const response = NextResponse.json<MostExpensiveRecentCardsResponse>({
      cards: formattedCards,
    })

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    response.headers.set('X-Server-Timing', `db;dur=${t1 - t0},total;dur=${t1 - t0}`)

    return response
  } catch (error) {
    console.error('Error fetching most expensive recent cards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch most expensive recent cards' },
      { status: 500 }
    )
  }
}
