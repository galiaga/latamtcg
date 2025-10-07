interface SkeletonTextProps {
  className?: string
  lines?: number
}

export default function SkeletonText({ className = "", lines = 1 }: SkeletonTextProps) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`skeleton-text animate-pulse ${i < lines - 1 ? 'mb-2' : ''}`}
          style={{ height: '1rem', width: i === lines - 1 ? '75%' : '100%' }}
        />
      ))}
    </div>
  )
}
