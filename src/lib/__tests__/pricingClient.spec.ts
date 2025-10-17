import { describe, it, expect } from 'vitest'
import { getDisplayPrice } from '@/lib/pricingClient'

describe('Pricing Client Fallback', () => {
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

  it('should compute CLP price when computedPriceClp is null', () => {
    const card = {
      priceUsd: 10,
      priceUsdFoil: null,
      priceUsdEtched: null,
      computedPriceClp: null
    }

    const result = getDisplayPrice(card, defaultConfig)
    
    // 10 * 950 * (1 + 0.7) + 0 = 16150
    // max(500, 16150) = 16150
    // ceilToStep(16150, 500) = 16500
    expect(result).toBe(16500)
  })

  it('should use cached CLP price when available', () => {
    const card = {
      priceUsd: 10,
      priceUsdFoil: null,
      priceUsdEtched: null,
      computedPriceClp: 15000
    }

    const result = getDisplayPrice(card, defaultConfig)
    expect(result).toBe(15000)
  })

  it('should return USD price when CLP is disabled', () => {
    const config = { ...defaultConfig, useCLP: false }
    const card = {
      priceUsd: 10,
      priceUsdFoil: null,
      priceUsdEtched: null,
      computedPriceClp: null
    }

    const result = getDisplayPrice(card, config)
    expect(result).toBe(10)
  })

  it('should return null when no USD price is available', () => {
    const card = {
      priceUsd: null,
      priceUsdFoil: null,
      priceUsdEtched: null,
      computedPriceClp: null
    }

    const result = getDisplayPrice(card, defaultConfig)
    expect(result).toBe(null)
  })
})
