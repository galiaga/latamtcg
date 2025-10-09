import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const t0 = Date.now()
    
    // Get the top 24 cards by cart count
    const popularCards = await prisma.$queryRaw<Array<{
      scryfallId: string
      name: string
      setCode: string
      setName: string
      collectorNumber: string
      priceUsd: number
      priceUsdFoil: number
      priceUsdEtched: number
      rarity: string
      cartCount: bigint
    }>>`
      SELECT 
        mc."scryfallId",
        mc.name,
        mc."setCode",
        COALESCE(s.set_name, mc."setCode") as "setName",
        mc."collectorNumber",
        mc."priceUsd",
        mc."priceUsdFoil", 
        mc."priceUsdEtched",
        mc.rarity,
        COUNT(ci.id) as "cartCount"
      FROM "MtgCard" mc
      LEFT JOIN "Set" s ON upper(s.set_code) = upper(mc."setCode")
      INNER JOIN "CartItem" ci ON ci."printingId" = mc."scryfallId"
      WHERE mc."isPaper" = true AND mc.lang = 'en'
        AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)
      GROUP BY mc."scryfallId", mc.name, mc."setCode", s.set_name, mc."collectorNumber", 
               mc."priceUsd", mc."priceUsdFoil", mc."priceUsdEtched", mc.rarity
      ORDER BY "cartCount" DESC
      LIMIT 24
    `

    // Convert BigInt to number and format the response
    const formattedCards = popularCards.map(card => ({
      id: card.scryfallId,
      name: card.name,
      setCode: card.setCode,
      setName: card.setName,
      collectorNumber: card.collectorNumber,
      priceUsd: card.priceUsd ? Number(card.priceUsd) : null,
      priceUsdFoil: card.priceUsdFoil ? Number(card.priceUsdFoil) : null,
      priceUsdEtched: card.priceUsdEtched ? Number(card.priceUsdEtched) : null,
      rarity: card.rarity,
      cartCount: Number(card.cartCount)
    }))

    const t1 = Date.now()
    const response = NextResponse.json({ 
      cards: formattedCards,
      total: formattedCards.length 
    })
    
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    response.headers.set('X-Server-Timing', `db;dur=${t1-t0},total;dur=${t1-t0}`)
    
    return response
  } catch (error) {
    console.error('Error fetching popular cards:', error)
    return NextResponse.json({ error: 'Failed to fetch popular cards' }, { status: 500 })
  }
}
