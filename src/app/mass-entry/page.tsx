export const metadata = {
  title: 'Mass Entry - LatamTCG',
  description: 'Bulk card entry and search functionality',
}

export default function MassEntryPage() {
  return (
    <div className="py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
            Mass Entry
          </h1>
          <p className="text-lg text-muted-foreground">
            Bulk card entry functionality coming soon
          </p>
        </div>

        <div
          className="rounded-xl border p-8 text-center"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
            <p className="text-muted-foreground mb-6">
              We're working on a mass entry feature that will allow you to quickly search and add multiple cards to your cart at once. This will be perfect for entering entire decklists or bulk card orders.
            </p>
            <p className="text-sm text-muted-foreground">
              In the meantime, you can use our{' '}
              <a
                href="/mtg/search"
                className="text-primary hover:underline"
              >
                search page
              </a>
              {' '}to find and add individual cards.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

