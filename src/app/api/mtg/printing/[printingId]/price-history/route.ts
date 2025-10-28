import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentPrice } from '@/lib/prices'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ printingId: string }> }
) {
  try {
    const { printingId } = await params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    // Get the scryfallId for this printing
    const card = await prisma.mtgCard.findUnique({
      where: { scryfallId: printingId },
      select: { scryfallId: true }
    })
    
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }
    
    // Calculate the date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Fetch price history for the last N days - optimized query
    const priceHistory = await prisma.$queryRaw<Array<{
      finish: string
      price: number
      price_day: string
    }>>`
      SELECT finish, price, price_day
      FROM mtgcard_price_history
      WHERE scryfall_id = ${printingId}::uuid
        AND price_day >= ${startDate.toISOString().slice(0, 10)}::date
        AND price_day <= ${endDate.toISOString().slice(0, 10)}::date
      ORDER BY price_day ASC, finish ASC
    `
    
    // Group by finish type and format for chart - optimized processing
    const chartData = {
      normal: priceHistory.filter(p => p.finish === 'normal').map(p => ({
        date: p.price_day,
        price: p.price
      })),
      foil: priceHistory.filter(p => p.finish === 'foil').map(p => ({
        date: p.price_day,
        price: p.price
      })),
      etched: priceHistory.filter(p => p.finish === 'etched').map(p => ({
        date: p.price_day,
        price: p.price
      }))
    }
    
    // Fallback: if no history rows, return a single-point series from current price table
    const hasData = Object.values(chartData).some(finish => finish.length > 0)
    if (!hasData) {
      const finishes: Array<'nonfoil'|'foil'|'etched'> = ['nonfoil','foil','etched']
      const series = { normal: [] as any[], foil: [] as any[], etched: [] as any[] }
      for (const f of finishes) {
        const { price, price_at } = await getCurrentPrice(printingId, f)
        if (price != null && price_at) {
          const point = { date: new Date(price_at).toISOString().slice(0,10), price: Number(price) }
          if (f === 'nonfoil') series.normal.push(point)
          else if (f === 'foil') series.foil.push(point)
          else series.etched.push(point)
        }
      }
      return NextResponse.json({ scryfallId: printingId, days, data: series, hasData: Object.values(series).some(arr => arr.length > 0) })
    }
    
    return NextResponse.json({ scryfallId: printingId, days, data: chartData, hasData })
    
  } catch (error) {
    console.error('Price history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
