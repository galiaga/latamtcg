interface PriceSkeletonProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { height: '0.875rem', width: '3rem' },
  md: { height: '1rem', width: '4rem' },
  lg: { height: '1.25rem', width: '5rem' },
}

/**
 * Skeleton for a price display.
 * Typical width for formatted currency values.
 */
export default function PriceSkeleton({
  className = '',
  size = 'md',
}: PriceSkeletonProps) {
  const sizeStyle = sizeMap[size] || sizeMap.md

  return (
    <div
      className={`skeleton-text rounded ${className}`}
      style={sizeStyle}
      aria-hidden="true"
    />
  )
}

