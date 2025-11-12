'use client'

import * as React from 'react'
import TwoSidedImage from '@/components/TwoSidedImage'
import styles from './CardImageWithShine.module.css'

interface CardImageWithShineProps {
  scryfallId: string
  alt: string
  initialVariantId: string
}

export function CardImageWithShine({ scryfallId, alt, initialVariantId }: CardImageWithShineProps) {
  const [selectedVariant, setSelectedVariant] = React.useState(initialVariantId)

  // Listen for variant changes via custom event
  React.useEffect(() => {
    const handleVariantChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ printingId: string; variantId: string }>
      if (customEvent.detail?.printingId === scryfallId) {
        setSelectedVariant(customEvent.detail.variantId)
      }
    }

    window.addEventListener('variant-changed', handleVariantChange)

    return () => {
      window.removeEventListener('variant-changed', handleVariantChange)
    }
  }, [scryfallId])

  const isFoil = selectedVariant === 'foil'

  return (
    <div className="relative w-full">
      <div
        className={`relative transition-all duration-500 ${
          isFoil ? styles.shineEffect : ''
        }`}
      >
        <TwoSidedImage scryfallId={scryfallId} alt={alt} mode="large" className="w-full" />
      </div>
    </div>
  )
}

