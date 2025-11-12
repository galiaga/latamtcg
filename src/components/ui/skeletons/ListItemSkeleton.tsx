interface ListItemSkeletonProps {
  className?: string
  showImage?: boolean
  showActions?: boolean
  lines?: number
}

/**
 * Skeleton for a list item (e.g., cart row, order item).
 * Configurable to match different list item layouts.
 */
export default function ListItemSkeleton({
  className = '',
  showImage = true,
  showActions = true,
  lines = 2,
}: ListItemSkeletonProps) {
  return (
    <div
      className={`flex items-center gap-4 border rounded p-3 ${className}`}
      style={{ borderColor: 'var(--border)' }}
      aria-hidden="true"
    >
      {showImage && (
        <div className="w-16 h-16 rounded skeleton-card" />
      )}
      <div className="flex-1 min-w-0 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton-text rounded"
            style={{
              height: '0.875rem',
              width: i === lines - 1 ? '60%' : '100%',
            }}
          />
        ))}
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded skeleton-text" />
          <div className="w-20 h-4 skeleton-text rounded" />
        </div>
      )}
    </div>
  )
}

