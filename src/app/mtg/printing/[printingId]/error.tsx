"use client"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-10 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Something went wrong loading this printing.</h1>
      <p style={{ color: 'var(--mutedText)' }}>{error?.message || 'Unknown error'}</p>
      <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
    </div>
  )
}


