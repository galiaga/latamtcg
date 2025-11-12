import { getAllSets } from '@/lib/sets'
import { AdvancedSearchForm } from '@/components/AdvancedSearchForm'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export const metadata = {
  title: 'Advanced Search - LatamTCG',
  description: 'Advanced search for Magic: The Gathering cards',
}

export default async function AdvancedSearchPage() {
  // Fetch all sets for the set selector
  const sets = await getAllSets()

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
            Advanced Search
          </h1>
          <p className="text-lg text-muted-foreground">
            Search for Magic: The Gathering cards with advanced filters
          </p>
        </div>

        <AdvancedSearchForm sets={sets} />
      </div>
    </div>
  )
}

