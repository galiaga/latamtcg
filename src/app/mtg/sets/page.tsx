import Link from 'next/link'
import { getAllSets } from '@/lib/sets'
import { SetSymbol } from '@/components/SetSymbol'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

export default async function SetsPage() {
  // Fetch all sets
  const sets = await getAllSets()

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
            All Sets
          </h1>
          <p className="text-lg text-muted-foreground">
            Browse all Magic: The Gathering sets in our collection
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {sets.map((set) => {
            const year = set.released_at ? new Date(set.released_at).getFullYear() : null

            return (
              <Link
                key={set.set_code}
                href={`/mtg/search?set=${encodeURIComponent(set.set_code)}`}
                className="group relative flex flex-col items-center p-4 rounded-xl border transition-all duration-200 hover:shadow-lg hover:scale-105"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                {/* Set Symbol */}
                <div className="relative w-24 h-24 md:w-28 md:h-28 mb-3 flex items-center justify-center">
                  <SetSymbol
                    setCode={set.set_code}
                    setName={set.set_name}
                    allSets={sets}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Set Name */}
                <div className="text-center w-full">
                  <h3 className="font-semibold text-sm md:text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {set.set_name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono uppercase">{set.set_code}</span>
                    {year && (
                      <>
                        <span>•</span>
                        <span>{year}</span>
                      </>
                    )}
                  </div>
                  {set.set_type && (
                    <div className="mt-1">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs"
                        style={{
                          background: 'var(--primarySoft)',
                          color: 'var(--primary)',
                        }}
                      >
                        {set.set_type}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

