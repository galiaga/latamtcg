interface CardSkeletonProps {
  className?: string
  aspectRatio?: string
  rounded?: boolean
}

/**
 * Skeleton for a card (e.g., MTG card).
 * Uses aspect ratio to maintain proper proportions.
 */
export default function CardSkeleton({
  className = '',
  aspectRatio = '63/88',
  rounded = true,
}: CardSkeletonProps) {
  return (
    <div
      className={`skeleton-card ${rounded ? 'rounded-2xl' : 'rounded'} ${className}`}
      style={{
        aspectRatio,
      }}
      aria-hidden="true"
    />
  )
}

