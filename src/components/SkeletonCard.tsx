interface SkeletonCardProps {
  className?: string
}

export default function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div className={`aspect-[63/88] rounded-2xl skeleton-card animate-pulse ${className}`} />
  )
}
