import Image, { ImageProps } from 'next/image'

/**
 * SmartImage wrapper that conditionally disables optimization based on environment flag
 * Use this as a drop-in replacement for next/image when you need component-level control
 * over image optimization. The global NEXT_IMAGE_UNOPTIMIZED flag in next.config.ts
 * is preferred for most use cases.
 */
export default function SmartImage(props: ImageProps) {
  const unoptimized = process.env.NEXT_PUBLIC_IMAGE_UNOPTIMIZED === 'true'
  return <Image {...props} unoptimized={unoptimized} />
}
