'use client'

import Link from 'next/link'
import { getScryfallNormalUrl } from '@/lib/images'
import AddToCartButton from './AddToCartButton'

interface CardTileProps {
  id: string
  name: string
  setCode: string
  setName: string
  collectorNumber: string
  priceUsd: number | null
  priceUsdFoil: number | null
  priceUsdEtched: number | null
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
  variantSuffix?: string | null
}

const formatPrice = (price: number) => {
  return `$${Math.ceil(price)}`
}

const getDisplayPrice = (card: CardTileProps) => {
  if (card.priceUsd) return card.priceUsd
  if (card.priceUsdFoil) return card.priceUsdFoil
  if (card.priceUsdEtched) return card.priceUsdEtched
  return 0
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
  rarity, 
  href 
}: CardTileProps) {
  const displayPrice = getDisplayPrice({ id, name, setCode, setName, collectorNumber, priceUsd, priceUsdFoil, priceUsdEtched, rarity, href })
  
  return (
    <Link
      href={href}
      className="group block animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="relative overflow-hidden rounded-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/25 group-hover:-translate-y-1">
        <div className="aspect-[63/88] relative">
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
        
        <div className="p-2 flex flex-col h-24">
          <h3 className="font-medium text-sm leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors flex-shrink-0">
            {name}
          </h3>
          <div className="text-xs text-muted-foreground mb-1 line-clamp-2 flex-shrink-0">
            {setName} • #{collectorNumber}
          </div>
          <div className="flex items-center justify-between gap-2 mt-auto">
            <span className="font-semibold text-primary text-sm leading-none whitespace-nowrap">
              {displayPrice > 0 ? formatPrice(displayPrice) : 'N/A'}
            </span>
            <div className="flex-shrink-0">
              <AddToCartButton printingId={id} size="xs" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
