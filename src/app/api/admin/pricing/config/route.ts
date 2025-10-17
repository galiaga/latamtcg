import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPricingConfig, updatePricingConfig } from '@/lib/pricingData'

const adminToken = process.env.ADMIN_TOKEN

function verifyAdminToken(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === adminToken
}

const pricingConfigSchema = z.object({
  useCLP: z.boolean().optional(),
  fxClp: z.number().positive().optional(),
  alphaTierLowUsd: z.number().positive().optional(),
  alphaTierMidUsd: z.number().positive().optional(),
  alphaLow: z.number().min(0).max(2).optional(),
  alphaMid: z.number().min(0).max(2).optional(),
  alphaHigh: z.number().min(0).max(2).optional(),
  priceMinPerCardClp: z.number().int().positive().optional(),
  roundToStepClp: z.number().int().positive().optional(),
  minOrderSubtotalClp: z.number().int().positive().optional(),
  shippingFlatClp: z.number().int().min(0).optional(),
  freeShippingThresholdClp: z.number().int().positive().nullable().optional()
})

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await getPricingConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Get pricing config error:', error)
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
    const result = pricingConfigSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid configuration data', details: result.error.issues },
        { status: 400 }
      )
    }

    const config = await updatePricingConfig(result.data)
    return NextResponse.json(config)
  } catch (error) {
    console.error('Update pricing config error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
