"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import NextImage from 'next/image'
import { getScryfallNormalFaceUrl, getScryfallSmallFaceUrl } from '@/lib/images'

type SizeMode = 'thumb' | 'large'

type Props = {
  scryfallId: string
  alt: string
  mode?: SizeMode
  className?: string
  hoverFlip?: boolean
  widthPx?: number // used for thumb mode to give the container intrinsic size
}

export default function TwoSidedImage({ scryfallId, alt, mode = 'thumb', className, hoverFlip = true, widthPx = 160 }: Props) {
  const [hasBack, setHasBack] = useState<boolean>(false)
  const [flipped] = useState<boolean>(false)
  const [hovering, setHovering] = useState<boolean>(false)
  const firstRenderRef = useRef(true)

  const frontUrl = useMemo(() => (mode === 'large' ? getScryfallNormalFaceUrl(scryfallId, 'front') : getScryfallSmallFaceUrl(scryfallId, 'front')), [scryfallId, mode])
  const backUrl = useMemo(() => (mode === 'large' ? getScryfallNormalFaceUrl(scryfallId, 'back') : getScryfallSmallFaceUrl(scryfallId, 'back')), [scryfallId, mode])
  const showBack = hasBack && (flipped || (hoverFlip && hovering))

  useEffect(() => {
    let cancelled = false
    if (typeof window === 'undefined') return
    // Probe with HEAD to avoid noisy image 404s in console for single-faced cards
    fetch(backUrl, { method: 'HEAD' })
      .then((res) => { if (!cancelled) setHasBack(res.ok) })
      .catch(() => { if (!cancelled) setHasBack(false) })
    return () => { cancelled = true }
     
  }, [backUrl])


  // Track first render but do not show any overlay text (explicitly removed)
  useEffect(() => {
    if (firstRenderRef.current) firstRenderRef.current = false
  }, [])

  const aspectClass = mode === 'large' ? 'aspect-[63/88]' : 'aspect-[3/4]'

  return (
    <div
      className={`card-mask relative ${mode === 'large' ? 'w-full' : ''} ${aspectClass} overflow-hidden rounded-xl group ${className ?? ''}`}
      style={mode === 'thumb' ? { width: `${widthPx}px` } : undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <NextImage
        src={frontUrl}
        alt={alt}
        fill
        sizes={mode === 'large' ? '(min-width:1024px) 28vw, 86vw' : '160px'}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${showBack ? 'opacity-0' : 'opacity-100'}`}
        priority={mode === 'large'}
      />
      {hasBack && (
        <NextImage
          src={backUrl}
          alt={`${alt} (Back)`}
          fill
          sizes={mode === 'large' ? '(min-width:1024px) 28vw, 86vw' : '160px'}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${showBack ? 'opacity-100' : 'opacity-0'}`}
          priority={mode === 'large'}
        />
      )}

      {/* No overlay text per request; tap to toggle for mobile */}
    </div>
  )
}


