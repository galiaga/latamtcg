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
    
    // Clean up the body: remove empty strings, convert to proper types, remove undefined
    const cleanedBody: Record<string, any> = {}
    for (const [key, value] of Object.entries(body)) {
      // Skip undefined values
      if (value === undefined) continue
      
      // Handle empty strings - convert to undefined for optional fields
      if (value === '' || value === null) {
        // Only allow null for freeShippingThresholdClp (can be null to disable)
        if (key === 'freeShippingThresholdClp') {
          cleanedBody[key] = null
        }
        // Skip other empty values
        continue
      }
      
      // Convert number strings to numbers
      if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
        const numValue = Number(value)
        if (!isNaN(numValue)) {
          cleanedBody[key] = numValue
        }
      } else {
        cleanedBody[key] = value
      }
    }
    
    console.log('[admin/pricing/config] Received body:', JSON.stringify(body, null, 2))
    console.log('[admin/pricing/config] Cleaned body:', JSON.stringify(cleanedBody, null, 2))
    
    const result = pricingConfigSchema.safeParse(cleanedBody)

    if (!result.success) {
      console.error('[admin/pricing/config] Validation failed:', result.error.issues)
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
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
