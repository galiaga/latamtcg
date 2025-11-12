interface BadgeSkeletonProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { height: '1rem', width: '2.5rem' },
  md: { height: '1.25rem', width: '3rem' },
  lg: { height: '1.5rem', width: '4rem' },
}

/**
 * Skeleton for a badge/chip element.
 * Rounded pill shape to match typical badge styling.
 */
export default function BadgeSkeleton({
  className = '',
  size = 'md',
}: BadgeSkeletonProps) {
  const sizeStyle = sizeMap[size] || sizeMap.md

  return (
    <div
      className={`skeleton-text rounded-full ${className}`}
      style={sizeStyle}
      aria-hidden="true"
    />
  )
}

