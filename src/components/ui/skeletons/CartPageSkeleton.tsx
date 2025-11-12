import { ListItemSkeleton, TextLineSkeleton, PriceSkeleton, ButtonSkeleton } from './index'

interface CartPageSkeletonProps {
  className?: string
  itemCount?: number
}

/**
 * Skeleton for the Cart/Checkout page.
 * Shows list of cart items, totals summary, and checkout button.
 */
export default function CartPageSkeleton({
  className = '',
  itemCount = 3,
}: CartPageSkeletonProps) {
  return (
    <div className={`mx-auto max-w-4xl p-2 md:p-6 space-y-6 ${className}`} aria-busy="true" aria-live="polite">
      {/* Title */}
      <TextLineSkeleton height="1.5rem" width="8rem" />

      {/* Cart items */}
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: itemCount }).map((_, i) => (
          <ListItemSkeleton key={i} showImage showActions lines={2} />
        ))}
      </div>

      {/* Totals summary */}
      <div className="ml-auto max-w-sm border rounded p-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex justify-between">
          <TextLineSkeleton height="1rem" width="4rem" />
          <PriceSkeleton size="md" />
        </div>
        <div className="flex justify-between">
          <TextLineSkeleton height="1rem" width="4rem" />
          <PriceSkeleton size="md" />
        </div>
        <div className="border-t pt-2 flex justify-between">
          <TextLineSkeleton height="1.25rem" width="3rem" />
          <PriceSkeleton size="lg" />
        </div>
        <ButtonSkeleton size="lg" fullWidth />
      </div>
    </div>
  )
}

