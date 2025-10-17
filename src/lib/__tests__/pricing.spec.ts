import { describe, it, expect } from 'vitest'
import { pickAlpha, ceilToStep, computePriceCLP } from '@/lib/pricing'

describe('Pricing System', () => {
  const defaultConfig = {
    tcgPriceUsd: 0,
    fxClp: 950,
    alphaLow: 0.9,
    alphaMid: 0.7,
    alphaHigh: 0.5,
    alphaTierLowUsd: 5,
    alphaTierMidUsd: 20,
    betaClp: 0,
    priceMinPerCardClp: 500,
    roundToStepClp: 500
  }

  describe('pickAlpha', () => {
    it('should return alphaLow for prices under low tier', () => {
      expect(pickAlpha(3, defaultConfig)).toBe(0.9)
    })

    it('should return alphaMid for prices in mid tier', () => {
      expect(pickAlpha(10, defaultConfig)).toBe(0.7)
    })

    it('should return alphaHigh for prices above mid tier', () => {
      expect(pickAlpha(25, defaultConfig)).toBe(0.5)
    })
  })

  describe('ceilToStep', () => {
    it('should round up to nearest step', () => {
      expect(ceilToStep(100, 500)).toBe(500)
      expect(ceilToStep(600, 500)).toBe(1000)
      expect(ceilToStep(1000, 500)).toBe(1000)
    })

    it('should handle zero step', () => {
      expect(ceilToStep(100, 0)).toBe(100)
    })
  })

  describe('computePriceCLP', () => {
    it('should compute correct price for low tier', () => {
      const config = { ...defaultConfig, tcgPriceUsd: 3 }
      const result = computePriceCLP(3, config)
      
      // 3 * 950 * (1 + 0.9) + 0 = 5415
      // max(500, 5415) = 5415
      // ceilToStep(5415, 500) = 5500
      expect(result).toBe(5500)
    })

    it('should enforce minimum per card', () => {
      const config = { ...defaultConfig, tcgPriceUsd: 0.1 }
      const result = computePriceCLP(0.1, config)
      
      // Should be at least priceMinPerCardClp
      expect(result).toBe(500)
    })

    it('should include beta in calculation', () => {
      const config = { ...defaultConfig, tcgPriceUsd: 5, betaClp: 100 }
      const result = computePriceCLP(5, config)
      
      // 5 * 950 * (1 + 0.7) + 100 = 8175
      // max(500, 8175) = 8175
      // ceilToStep(8175, 500) = 8500
      expect(result).toBe(8500)
    })
  })
})
