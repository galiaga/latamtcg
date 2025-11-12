interface GridCardSkeletonProps {
  className?: string
  showBadge?: boolean
  showPrice?: boolean
  showButton?: boolean
}

/**
 * Skeleton for a card in a grid layout (e.g., search results).
 * Matches the typical card tile layout with image, title, badges, price, and button.
 */
export default function GridCardSkeleton({
  className = '',
  showBadge = true,
  showPrice = true,
  showButton = true,
}: GridCardSkeletonProps) {
  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      aria-hidden="true"
    >
      {/* Card image */}
      <div className="aspect-[63/88] rounded-2xl skeleton-card" />
      
      {/* Title */}
      <div className="skeleton-text rounded" style={{ height: '1rem', width: '85%' }} />
      
      {/* Badge and price row */}
      <div className="flex items-center justify-between gap-2">
        {showBadge && (
          <div className="skeleton-text rounded-full" style={{ height: '1.25rem', width: '3rem' }} />
        )}
        {showPrice && (
          <div className="skeleton-text rounded" style={{ height: '1rem', width: '4rem' }} />
        )}
      </div>
      
      {/* Button */}
      {showButton && (
        <div className="skeleton-text rounded-lg" style={{ height: '2rem', width: '100%' }} />
      )}
    </div>
  )
}

