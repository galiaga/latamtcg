interface ButtonSkeletonProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const sizeMap = {
  sm: { height: '1.75rem', minWidth: '4rem' },
  md: { height: '2rem', minWidth: '5rem' },
  lg: { height: '2.5rem', minWidth: '6rem' },
}

/**
 * Skeleton for a button.
 * Matches typical button dimensions to prevent layout shift.
 */
export default function ButtonSkeleton({
  className = '',
  size = 'md',
  fullWidth = false,
}: ButtonSkeletonProps) {
  const sizeStyle = sizeMap[size] || sizeMap.md

  return (
    <div
      className={`skeleton-text rounded-lg ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        ...sizeStyle,
        width: fullWidth ? '100%' : undefined,
      }}
      aria-hidden="true"
    />
  )
}

