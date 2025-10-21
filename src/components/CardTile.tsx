'use client'

import Link from 'next/link'
import { getScryfallNormalUrl } from '@/lib/images'
import AddToCartButton from './AddToCartButton'
import { usePricing } from './PricingProvider'
import { getDisplayPrice, formatPrice } from '@/lib/pricingClient'

interface CardTileProps {
  id: string
  name: string
  setCode: string
  setName: string
  collectorNumber: string
  priceUsd: number | null
  priceUsdFoil: number | null
  priceUsdEtched: number | null
  computedPriceClp?: number | null
  rarity: string
  href: string
  variantSuffix?: string | null
}

// Flexible interface for SearchResultsGrid items
interface SearchItem {
  id?: string
  title: string
  setCode?: string
  setName?: string | null
  collectorNumber?: string | number | null
  priceUsd?: number | string | null
  priceUsdFoil?: number | string | null
  priceUsdEtched?: number | string | null
  computedPriceClp?: number | null
  variantSuffix?: string | null
}

// Helper function to convert SearchItem to CardTileProps
export const convertSearchItemToCardTile = (item: SearchItem, href: string): CardTileProps => {
  const title = String(item.title || '').replace(/\(Full Art\)/gi, '(Borderless)')
  const displayTitle = item.variantSuffix ? `${title}${item.variantSuffix}` : title
  
  return {
    id: item.id || '',
    name: displayTitle,
    setCode: item.setCode || '',
    setName: item.setName || item.setCode || '',
    collectorNumber: String(item.collectorNumber || ''),
    priceUsd: typeof item.priceUsd === 'string' ? (parseFloat(item.priceUsd) || null) : (item.priceUsd ?? null),
    priceUsdFoil: typeof item.priceUsdFoil === 'string' ? (parseFloat(item.priceUsdFoil) || null) : (item.priceUsdFoil ?? null),
    priceUsdEtched: typeof item.priceUsdEtched === 'string' ? (parseFloat(item.priceUsdEtched) || null) : (item.priceUsdEtched ?? null),
    computedPriceClp: item.computedPriceClp ?? null,
    rarity: '', // Not available in SearchItem
    href,
    variantSuffix: item.variantSuffix
  }
}

export default function CardTile({ 
  id, 
  name, 
  setCode, 
  setName, 
  collectorNumber, 
  priceUsd, 
  priceUsdFoil, 
  priceUsdEtched, 
  computedPriceClp,
  rarity, 
  href 
}: CardTileProps) {
  const { config } = usePricing()
  
  const card = {
    priceUsd,
    priceUsdFoil,
    priceUsdEtched,
    computedPriceClp
  }
  
  const displayPrice = getDisplayPrice(card, config)
  
  return (
    <div className="group block animate-[fadeIn_0.2s_ease-out] max-w-[312px]">
      <div className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/25 group-hover:-translate-y-1">
        {/* Clickable area for navigation - only image and title */}
        <Link href={href} className="block">
          {/* Image wrapper with same x-padding as the body */}
          <div className="px-2 md:px-4 pt-4">
            <div className="aspect-[2.5/3.5] relative h-[200px] md:h-[300px]">
              <div className="card-mask h-full w-full">
                <img
                  src={getScryfallNormalUrl(id)}
                  alt={`${name} — ${setName} #${collectorNumber}`}
                  className="w-full h-full object-contain transition-all duration-300 group-hover:opacity-90 group-hover:brightness-110"
                  loading="lazy"
                />
              </div>
              {/* Enhanced glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {/* Subtle border glow */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/20 transition-colors duration-300"></div>
            </div>
          </div>
          
          {/* Title area with fixed height */}
          <div className="px-2 md:px-4">
            <div className="min-h-[68px]">
              <h3 className="text-base font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {name}
              </h3>
              <div className="text-xs text-muted-foreground truncate mt-1">
                {setName} • #{collectorNumber}
              </div>
            </div>
          </div>
        </Link>
        
        {/* Non-clickable area for price and add to cart */}
        <div className="px-2 md:px-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-semibold text-[var(--fg-strong)] tracking-tight">
                {displayPrice ? formatPrice(displayPrice, config) : 'N/A'}
              </span>
            </div>
            <AddToCartButton printingId={id} title={name} />
          </div>
        </div>
      </div>
    </div>
  )
}
