interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Spinner({ className = "", size = 'md' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }

  return (
    <div 
      className={`animate-spin rounded-full border-2 border-transparent border-t-current ${sizeClasses[size]} ${className}`}
      style={{ borderTopColor: 'var(--primary)' }}
    />
  )
}
