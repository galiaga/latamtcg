import { GridCardSkeleton } from './index'

interface SearchPageSkeletonProps {
  className?: string
  itemCount?: number
}

/**
 * Skeleton for the search/PLP (Product Listing Page).
 * Shows filter bar placeholder and a responsive grid of card skeletons.
 */
export default function SearchPageSkeleton({
  className = '',
  itemCount = 12,
}: SearchPageSkeletonProps) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      {/* Filter bar skeleton */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-text rounded-full"
            style={{ height: '2rem', width: `${Math.random() * 60 + 60}px` }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Results grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: itemCount }).map((_, i) => (
          <GridCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

