import SkeletonCard from '@/components/SkeletonCard'
import SkeletonText from '@/components/SkeletonText'

export default function Loading() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <SkeletonCard className="w-full max-w-sm mx-auto" />
        </div>
        <div className="space-y-4">
          <SkeletonText lines={3} className="space-y-2" />
          <div className="h-8 w-32 skeleton-text animate-pulse" />
          <div className="h-6 w-24 skeleton-text animate-pulse" />
        </div>
      </div>
    </div>
  )
}


