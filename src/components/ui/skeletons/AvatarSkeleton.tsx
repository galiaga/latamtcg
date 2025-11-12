interface AvatarSkeletonProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | number
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

/**
 * Skeleton for an avatar/profile image.
 * Circular by default to match typical avatar shapes.
 */
export default function AvatarSkeleton({
  className = '',
  size = 'md',
}: AvatarSkeletonProps) {
  const sizeClass =
    typeof size === 'number'
      ? ''
      : sizeMap[size] || sizeMap.md
  const sizeStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : {}

  return (
    <div
      className={`rounded-full skeleton-card ${sizeClass} ${className}`}
      style={sizeStyle}
      aria-hidden="true"
    />
  )
}

