"use client"

import Image from 'next/image'

type ThumbProps = {
  mode?: 'thumb'
  src: string
  alt: string
  width: number
  priority?: boolean
  className?: string
}

type LargeProps = {
  mode: 'large'
  src: string
  alt: string
  priority?: boolean
  className?: string
}

type Props = ThumbProps | LargeProps

export default function CardImage(props: Props) {
  if (props.mode === 'large') {
    // Responsive large image using fill inside a 3:4 wrapper
    const { src, alt, priority, className } = props
    return (
      <div className={`relative aspect-[3/4] w-full max-w-[680px] ${className ?? ''}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 90vw, 680px"
          className="object-contain rounded"
          priority={priority}
        />
      </div>
    )
  }

  // Thumbnail: explicit width/height, maintain DPR scaling with height:auto
  const { src, alt, width, priority, className } = props
  const height = Math.round(width * 4 / 3)
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`rounded ${className ?? ''}`}
      style={{ height: 'auto' }}
      loading={priority ? undefined : 'lazy'}
      sizes={`${width}px`}
      priority={priority}
    />
  )
}

// Note: Do not apply width/height CSS directly on <Image>.
// Use CardImage for MTG cards to preserve the 3:4 aspect ratio without Next.js warnings.


