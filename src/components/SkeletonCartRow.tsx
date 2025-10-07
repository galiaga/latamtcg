interface SkeletonCartRowProps {
  className?: string
}

export default function SkeletonCartRow({ className = "" }: SkeletonCartRowProps) {
  return (
    <div className={`flex items-center gap-4 border rounded p-3 ${className}`}>
      <div className="w-16 h-16 rounded skeleton-card animate-pulse" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-3/4 skeleton-text animate-pulse mb-2" />
        <div className="h-3 w-1/2 skeleton-text animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded skeleton-text animate-pulse" />
        <div className="w-8 h-6 skeleton-text animate-pulse" />
        <div className="w-8 h-8 rounded skeleton-text animate-pulse" />
      </div>
      <div className="w-20 h-4 skeleton-text animate-pulse" />
      <div className="w-24 h-4 skeleton-text animate-pulse" />
      <div className="w-8 h-8 rounded skeleton-text animate-pulse" />
    </div>
  )
}
