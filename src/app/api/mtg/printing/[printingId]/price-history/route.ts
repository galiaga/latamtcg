import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    
    return NextResponse.json({
      scryfallId: printingId,
      days,
      data: chartData,
      hasData: Object.values(chartData).some(finish => finish.length > 0)
    })
    
  } catch (error) {
    console.error('Price history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
