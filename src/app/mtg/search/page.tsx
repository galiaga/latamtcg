import SearchResultsGrid from '@/components/SearchResultsGrid'

export const metadata = {
  robots: { index: false, follow: true },
  title: 'Search MTG',
}

export default function MtgSearchPage() {
  return (
    <div className="py-6">
      <section className="max-w-6xl mx-auto px-4">
        <SearchResultsGrid />
      </section>
    </div>
  )
}


