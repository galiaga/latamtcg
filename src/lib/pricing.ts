/**
 * Pricing calculation utilities for LatamTCG
 * 
 * Formula: FinalPriceCLP = ceil_to_step(
 *   max(priceMinPerCardClp, (TCGPriceUSD * FX_CLP * (1 + alpha)) + betaClp),
 *   roundToStepClp
 * )
 */

export type PricingInputs = {
  tcgPriceUsd: number
  fxClp: number
  alphaLow: number
  alphaMid: number
  alphaHigh: number
  alphaTierLowUsd: number
  alphaTierMidUsd: number
  betaClp: number
  priceMinPerCardClp: number   // 500 by default
  roundToStepClp: number       // 500 by default
}

/**
 * Determines the alpha markup based on USD price tier
 */
export function pickAlpha(usd: number, cfg: PricingInputs): number {
  if (usd < Number(cfg.alphaTierLowUsd)) return Number(cfg.alphaLow)
  if (usd <= Number(cfg.alphaTierMidUsd)) return Number(cfg.alphaMid)
  return Number(cfg.alphaHigh)
}

/**
 * Rounds up to the nearest step (e.g., 500 CLP increments)
 */
export function ceilToStep(value: number, step: number): number {
  if (step <= 0) return Math.ceil(value)
  return Math.ceil(value / step) * step
}

/**
 * Computes the final CLP price using the pricing formula
 */
export function computePriceCLP(usd: number, cfg: PricingInputs): number {
  const alpha = pickAlpha(usd, cfg)
  const base = usd * Number(cfg.fxClp)
  const preFloor = base * (1 + alpha) + Number(cfg.betaClp)
  const floored = Math.max(Number(cfg.priceMinPerCardClp), Math.ceil(preFloor))
  return ceilToStep(floored, Number(cfg.roundToStepClp))
}

/**
 * Formats CLP currency using Chilean locale
 */
export const formatCLP = (n: number): string => {
  return `$${n.toLocaleString("es-CL")}`
}

/**
 * Calculates shipping cost based on order subtotal and configuration
 */
export function calculateShipping(
  subtotalClp: number,
  shippingFlatClp: number,
  freeShippingThresholdClp?: number | null
): number {
  if (freeShippingThresholdClp && subtotalClp >= freeShippingThresholdClp) {
    return 0
  }
  return shippingFlatClp
}

/**
 * Checks if order meets minimum subtotal requirement
 */
export function meetsMinimumOrder(
  subtotalClp: number,
  minOrderSubtotalClp: number
): boolean {
  return subtotalClp >= minOrderSubtotalClp
}

/**
 * Calculates amount needed to reach minimum order
 */
export function amountToMinimum(
  subtotalClp: number,
  minOrderSubtotalClp: number
): number {
  return Math.max(0, minOrderSubtotalClp - subtotalClp)
}

/**
 * Calculates amount needed to reach free shipping threshold
 */
export function amountToFreeShipping(
  subtotalClp: number,
  freeShippingThresholdClp?: number | null
): number {
  if (!freeShippingThresholdClp) return 0
  return Math.max(0, freeShippingThresholdClp - subtotalClp)
}
