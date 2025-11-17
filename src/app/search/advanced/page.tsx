import { getAllSets } from '@/lib/sets'
import { AdvancedSearchForm } from '@/components/AdvancedSearchForm'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function generateMetadata() {
  const t = await getTranslations()
  return {
    title: `${t('search.advancedSearch')} - LatamTCG`,
    description: t('search.advancedSearchDescription'),
  }
}

export default async function AdvancedSearchPage() {
  const t = await getTranslations()
  // Fetch all sets for the set selector
  const sets = await getAllSets()

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
            {t('search.advancedSearch')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('search.advancedSearchDescription')}
          </p>
        </div>

        <AdvancedSearchForm sets={sets} />
      </div>
    </div>
  )
}

