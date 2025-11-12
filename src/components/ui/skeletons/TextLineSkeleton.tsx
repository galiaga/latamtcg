interface TextLineSkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
}

/**
 * Skeleton for a single line of text.
 * Matches typical text line height to avoid layout shift.
 */
export default function TextLineSkeleton({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = true,
}: TextLineSkeletonProps) {
  return (
    <div
      className={`skeleton-text ${rounded ? 'rounded' : ''} ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
      }}
      aria-hidden="true"
    />
  )
}

