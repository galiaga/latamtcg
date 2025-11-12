interface ImageSkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  aspectRatio?: string
  rounded?: boolean
}

/**
 * Skeleton for an image placeholder.
 * Maintains aspect ratio to prevent layout shift.
 */
export default function ImageSkeleton({
  className = '',
  width,
  height,
  aspectRatio,
  rounded = true,
}: ImageSkeletonProps) {
  const style: React.CSSProperties = {}
  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width
  }
  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height
  }
  if (aspectRatio) {
    style.aspectRatio = aspectRatio
  }

  return (
    <div
      className={`skeleton-card ${rounded ? 'rounded-xl' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

