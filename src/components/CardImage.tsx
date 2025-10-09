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
    // Responsive large image using fill inside a 63/88 wrapper for official MTG ratio
    const { src, alt, priority, className } = props
    return (
      <div
        className={`relative aspect-[63/88] w-full rounded-xl border overflow-hidden ${className ?? ''}`}
        style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
      >
        <div className="card-mask h-full w-full">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 86vw, (min-width: 1280px) 30vw, (min-width: 1024px) 28vw, 90vw"
            className="h-full w-full object-contain transition-transform duration-300 will-change-transform hover:scale-[1.02]"
            priority={priority}
          />
        </div>
      </div>
    )
  }

  // Thumbnail: explicit width/height, maintain DPR scaling with height:auto
  const { src, alt, width, priority, className } = props
  const height = Math.round(width * 4 / 3)
  return (
    <div className="card-mask">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`block w-full h-auto ${className ?? ''}`}
        style={{ height: 'auto' }}
        loading={priority ? undefined : 'lazy'}
        sizes={`${width}px`}
        priority={priority}
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement
          // graceful fallback to a neutral placeholder
          el.src = '/window.svg'
        }}
      />
    </div>
  )
}

// Note: Do not apply width/height CSS directly on <Image>.
// Use CardImage for MTG cards to preserve the 3:4 aspect ratio without Next.js warnings.


