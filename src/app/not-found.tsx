import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="p-10 text-center space-y-4">
      <h1 className="text-2xl font-semibold">404 — This page could not be found.</h1>
      <p style={{ color: 'var(--mutedText)' }}>
        The spell fizzled — this page doesn’t exist in any zone.
      </p>
      <div>
        <Link href="/mtg" className="btn-primary btn">Go back to search</Link>
      </div>
    </div>
  )
}


