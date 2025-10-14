import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const scryfallId = String(searchParams.get('scryfallId') || '')
    if (!scryfallId) return NextResponse.json({ error: 'missing scryfallId' }, { status: 400 })
    const days = Math.min(365, Math.max(1, Number(searchParams.get('days') || '30')))
    const finish = (searchParams.get('finish') || 'normal').toLowerCase()
    if (!['normal', 'foil', 'etched'].includes(finish)) {
      return NextResponse.json({ error: 'invalid finish' }, { status: 400 })
    }

    // Coalesce to one sample per day
    const since = new Date(Date.now() - days * 24 * 3600 * 1000)
    const rows = await prisma.$queryRaw<{ t: Date, price: number }[]>`
      SELECT price_day AS t,
             MAX(price) AS price
      FROM mtgcard_price_history
      WHERE scryfall_id = ${scryfallId}::uuid
        AND finish = ${finish}
        AND price_day >= ${(since)}
      GROUP BY 1
      ORDER BY 1 ASC
    `

    return NextResponse.json(rows.map(r => ({ t: r.t.toISOString(), price: Number(r.price) })))
  } catch (err) {
    console.error('[price.history] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


