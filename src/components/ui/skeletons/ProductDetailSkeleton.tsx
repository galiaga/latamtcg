import { ImageSkeleton, TextLineSkeleton, BadgeSkeleton, PriceSkeleton, ButtonSkeleton } from './index'

interface ProductDetailSkeletonProps {
  className?: string
}

/**
 * Skeleton for the Product Detail Page (PDP).
 * Shows image gallery, title, badges, price, and CTA button.
 */
export default function ProductDetailSkeleton({
  className = '',
}: ProductDetailSkeletonProps) {
  return (
    <div className={`p-2 md:p-6 space-y-3 md:space-y-6 ${className}`} aria-busy="true" aria-live="polite">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-1 text-sm">
        <div className="skeleton-text rounded" style={{ height: '0.875rem', width: '3rem' }} aria-hidden="true" />
        <span aria-hidden="true">›</span>
        <div className="skeleton-text rounded" style={{ height: '0.875rem', width: '4rem' }} aria-hidden="true" />
        <span aria-hidden="true">›</span>
        <div className="skeleton-text rounded" style={{ height: '0.875rem', width: '5rem' }} aria-hidden="true" />
      </div>

      <div className="flex items-start gap-8 flex-col lg:flex-row">
        {/* Left: Image */}
        <div className="self-center lg:self-start lg:sticky lg:top-24 w-[min(86vw,420px)] lg:w-[clamp(320px,28vw,440px)] xl:w-[clamp(360px,30vw,480px)]">
          <ImageSkeleton aspectRatio="63/88" className="w-full" />
        </div>

        {/* Right: Details */}
        <div className="flex-1 card card-2xl p-4 w-[min(86vw,420px)] md:w-auto md:max-w-none space-y-4">
          {/* Title */}
          <TextLineSkeleton height="1.75rem" width="80%" />
          <TextLineSkeleton height="1.75rem" width="60%" />

          {/* Price and variant section */}
          <div className="space-y-2">
            <PriceSkeleton size="lg" />
            <div className="flex items-center gap-2">
              <div className="skeleton-text rounded-lg" style={{ height: '2.5rem', width: '8rem' }} aria-hidden="true" />
              <div className="skeleton-text rounded-lg" style={{ height: '2.5rem', width: '8rem' }} aria-hidden="true" />
            </div>
            <ButtonSkeleton size="lg" fullWidth />
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <BadgeSkeleton size="md" />
            <BadgeSkeleton size="md" />
            <BadgeSkeleton size="md" />
          </div>

          {/* Description lines */}
          <div className="space-y-2">
            <TextLineSkeleton width="100%" />
            <TextLineSkeleton width="95%" />
            <TextLineSkeleton width="85%" />
          </div>
        </div>
      </div>
    </div>
  )
}

