import { ListItemSkeleton, TextLineSkeleton } from './index'

interface TablePageSkeletonProps {
  className?: string
  rowCount?: number
  showHeader?: boolean
}

/**
 * Skeleton for generic table/list pages (e.g., orders, admin tables).
 * Shows header bar and list of row skeletons.
 */
export default function TablePageSkeleton({
  className = '',
  rowCount = 8,
  showHeader = true,
}: TablePageSkeletonProps) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      {showHeader && (
        <div className="mb-4 flex items-center justify-between">
          <TextLineSkeleton height="1.5rem" width="10rem" />
          <div className="skeleton-text rounded-lg" style={{ height: '2rem', width: '8rem' }} aria-hidden="true" />
        </div>
      )}

      <div className="space-y-2">
        {Array.from({ length: rowCount }).map((_, i) => (
          <ListItemSkeleton key={i} showImage={false} showActions lines={3} />
        ))}
      </div>
    </div>
  )
}

