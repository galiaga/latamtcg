'use client'

import { PricingConfig } from '@/lib/pricingData'
import { computePriceCLP, formatCLP } from '@/lib/pricing'

/**
 * Client-side pricing utilities
 */

export interface CardPrice {
  priceUsd?: number | null
  priceUsdFoil?: number | null
  priceUsdEtched?: number | null
  computedPriceClp?: number | null
}

/**
 * Gets the best available price for a card (CLP if enabled, otherwise USD)
 */
export function getBestPrice(card: CardPrice, config: PricingConfig | null): number | null {
  if (!config) return null
  
  if (config.useCLP && card.computedPriceClp) {
    return card.computedPriceClp
  }
  
  // Fallback to USD prices
  if (card.priceUsd) return card.priceUsd
  if (card.priceUsdFoil) return card.priceUsdFoil
  if (card.priceUsdEtched) return card.priceUsdEtched
  return null
}

/**
 * Formats price based on configuration
 */
export function formatPrice(price: number | null, config: PricingConfig | null): string {
  if (price === null || price === undefined) return 'Not available'
  
  if (config?.useCLP) {
    return formatCLP(price)
  }
  
  return `$${Math.ceil(price)}`
}

/**
 * Gets display price for a card based on printing selection
 */
export function getDisplayPrice(
  card: CardPrice, 
  config: PricingConfig | null,
  printingSelection?: string[]
): number | null {
  if (!config) return null
  
  // Get the best USD price first
  let usdPrice: number | null = null
  
  if (printingSelection && printingSelection.length === 1) {
    const selected = printingSelection[0]
    if (selected === 'etched' && card.priceUsdEtched) usdPrice = card.priceUsdEtched
    else if (selected === 'foil' && card.priceUsdFoil) usdPrice = card.priceUsdFoil
    else if (selected === 'normal' && card.priceUsd) usdPrice = card.priceUsd
  } else {
    // Fallback to best available USD price
    if (card.priceUsd) usdPrice = card.priceUsd
    else if (card.priceUsdFoil) usdPrice = card.priceUsdFoil
    else if (card.priceUsdEtched) usdPrice = card.priceUsdEtched
  }
  
  if (!usdPrice) return null
  
  // If CLP is enabled, use cached price or compute on the fly
  if (config.useCLP) {
    if (card.computedPriceClp) {
      return card.computedPriceClp
    }
    
    // Compute CLP price on the fly if not cached
    return computePriceCLP(usdPrice, {
      tcgPriceUsd: usdPrice,
      fxClp: config.fxClp,
      alphaLow: config.alphaLow,
      alphaMid: config.alphaMid,
      alphaHigh: config.alphaHigh,
      alphaTierLowUsd: config.alphaTierLowUsd,
      alphaTierMidUsd: config.alphaTierMidUsd,
      betaClp: 0, // Default to 0 for now, can be enhanced later
      priceMinPerCardClp: config.priceMinPerCardClp,
      roundToStepClp: config.roundToStepClp
    })
  }
  
  // Return USD price if CLP is disabled
  return usdPrice
}

/**
 * Computes CLP price on client side (for real-time calculation)
 */
export async function computePriceCLPClient(tcgPriceUsd: number): Promise<number | null> {
  try {
    const response = await fetch(`/api/pricing/preview?tcgUsd=${tcgPriceUsd}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.finalClp
  } catch {
    return null
  }
}
