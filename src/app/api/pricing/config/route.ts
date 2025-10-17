import { NextRequest, NextResponse } from 'next/server'
import { getPricingConfig } from '@/lib/pricingData'

export async function GET(request: NextRequest) {
  try {
    const config = await getPricingConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Get pricing config error:', error)
    
    // Return default configuration if database is not available
    const defaultConfig = {
      id: 'default',
      useCLP: true,
      fxClp: 950,
      alphaTierLowUsd: 5,
      alphaTierMidUsd: 20,
      alphaLow: 0.9,
      alphaMid: 0.7,
      alphaHigh: 0.5,
      priceMinPerCardClp: 500,
      roundToStepClp: 500,
      minOrderSubtotalClp: 10000,
      shippingFlatClp: 2500,
      freeShippingThresholdClp: 25000,
      updatedAt: new Date(),
      createdAt: new Date()
    }
    
    return NextResponse.json(defaultConfig)
  }
}
