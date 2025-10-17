import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertDailyShipping, getRecentDailyShipping } from '@/lib/pricingData'

const adminToken = process.env.ADMIN_TOKEN

function verifyAdminToken(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === adminToken
}

const dailyShippingSchema = z.object({
  date: z.string().transform(str => new Date(str)).refine(date => !isNaN(date.getTime()), {
    message: 'Invalid date format'
  }),
  totalShippingUsd: z.number().min(0),
  cardsCount: z.number().int().positive(),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '7')
    
    const records = await getRecentDailyShipping(limit)
    return NextResponse.json(records)
  } catch (error) {
    console.error('Get daily shipping error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = dailyShippingSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid daily shipping data', details: result.error.issues },
        { status: 400 }
      )
    }

    const record = await upsertDailyShipping(result.data)
    return NextResponse.json(record)
  } catch (error) {
    console.error('Upsert daily shipping error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
