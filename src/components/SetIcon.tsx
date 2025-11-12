'use client'

import Image from 'next/image'
import { useState } from 'react'

interface SetIconProps {
  src: string | null
  alt: string
  setCode: string
}

export function SetIcon({ src, alt, setCode }: SetIconProps) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div
        className="w-full h-full rounded-lg flex items-center justify-center"
        style={{ background: 'var(--surface-2)' }}
      >
        <span className="text-2xl font-bold text-muted-foreground">
          {setCode.substring(0, 2).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-contain rounded-lg transition-transform duration-200 group-hover:scale-105"
      sizes="(max-width: 640px) 96px, 112px"
      onError={() => setHasError(true)}
    />
  )
}

