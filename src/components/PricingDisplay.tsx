'use client'

import { usePricing } from './PricingProvider'
import { getDisplayPrice, formatPrice } from '@/lib/pricingClient'

interface PricingDisplayProps {
  priceUsd?: number | null
  priceUsdFoil?: number | null
  priceUsdEtched?: number | null
  computedPriceClp?: number | null
  hasNonfoil?: boolean
  hasFoil?: boolean
  hasEtched?: boolean
}

export default function PricingDisplay({
  priceUsd,
  priceUsdFoil,
  priceUsdEtched,
  computedPriceClp,
  hasNonfoil,
  hasFoil,
  hasEtched
}: PricingDisplayProps) {
  const { config } = usePricing()

  const card = {
    priceUsd,
    priceUsdFoil,
    priceUsdEtched,
    computedPriceClp
  }

  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-lg font-medium">Pricing</h3>
      <div className="space-y-2">
        {hasNonfoil && priceUsd && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Normal</span>
            <div className="text-right">
              <div className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>
                {formatPrice(getDisplayPrice(card, config, ['normal']), config)}
              </div>
            </div>
          </div>
        )}
        {hasFoil && priceUsdFoil && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Foil</span>
            <div className="text-right">
              <div className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>
                {formatPrice(getDisplayPrice(card, config, ['foil']), config)}
              </div>
            </div>
          </div>
        )}
        {hasEtched && priceUsdEtched && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Etched</span>
            <div className="text-right">
              <div className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>
                {formatPrice(getDisplayPrice(card, config, ['etched']), config)}
              </div>
            </div>
          </div>
        )}
        {!hasNonfoil && !hasFoil && !hasEtched && (
          <div className="p-3 border rounded-lg text-center text-gray-500">
            No pricing available
          </div>
        )}
      </div>
    </div>
  )
}
