import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const t0 = Date.now()
    
    // Get a random card that has pricing
    const randomCard = await prisma.$queryRaw<Array<{
      scryfallId: string
    }>>`
      SELECT mc."scryfallId"
      FROM "MtgCard" mc
      WHERE mc."isPaper" = true 
        AND mc.lang = 'en'
        AND (mc."priceUsd" IS NOT NULL OR mc."priceUsdFoil" IS NOT NULL OR mc."priceUsdEtched" IS NOT NULL)
      ORDER BY RANDOM()
      LIMIT 1
    `

    if (!randomCard || randomCard.length === 0) {
      return NextResponse.json({ error: 'No random card found' }, { status: 404 })
    }

    const t1 = Date.now()
    const response = NextResponse.json({ 
      printingId: randomCard[0].scryfallId
    })
    
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('X-Server-Timing', `db;dur=${t1-t0},total;dur=${t1-t0}`)
    
    return response
  } catch (error) {
    console.error('Error fetching random item:', error)
    return NextResponse.json({ error: 'Failed to fetch random item' }, { status: 500 })
  }
}

