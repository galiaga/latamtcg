/**
 * Chilexpress shipping cost calculation
 * 
 * Simple config-based shipping cost model for Chilexpress.
 * Easy to modify later by updating the regionCosts mapping.
 */

export type ShippingInput = {
  region: string
}

export type ShippingQuote = {
  courier: 'Chilexpress'
  cost: number // in CLP
}

/**
 * Region-to-cost mapping for Chilexpress shipping
 * 
 * Easy to modify: just update this object to change shipping costs
 */
const regionCosts: Record<string, number> = {
  // Región Metropolitana (RM) - various ways it might be written
  'Región Metropolitana': 3000,
  'RM': 3000,
  'Metropolitana': 3000,
  'Metropolitan Region': 3000,
  // All other regions
  'default': 4000,
}

/**
 * Normalizes region name for consistent lookup
 */
function normalizeRegion(region: string): string {
  return region.trim()
}

/**
 * Calculates Chilexpress shipping cost based on region
 * 
 * @param input - Shipping input with region
 * @returns Shipping quote with courier name and cost in CLP
 */
export function calculateChilexpressShipping(input: ShippingInput): ShippingQuote {
  const normalizedRegion = normalizeRegion(input.region)
  
  // Try exact match first
  if (regionCosts[normalizedRegion] !== undefined) {
    return {
      courier: 'Chilexpress',
      cost: regionCosts[normalizedRegion],
    }
  }
  
  // Try case-insensitive match
  const lowerRegion = normalizedRegion.toLowerCase()
  for (const [key, cost] of Object.entries(regionCosts)) {
    if (key.toLowerCase() === lowerRegion) {
      return {
        courier: 'Chilexpress',
        cost,
      }
    }
  }
  
  // Default cost for any other region
  return {
    courier: 'Chilexpress',
    cost: regionCosts.default,
  }
}

