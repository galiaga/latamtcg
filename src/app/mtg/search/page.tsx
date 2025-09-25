import SearchResultsGrid from '@/components/SearchResultsGrid'

export const metadata = {
  robots: { index: false, follow: true },
  title: 'Search MTG',
}

export default function MtgSearchPage() {
  return (
    <div className="py-2">
      <section className="px-4">
        <SearchResultsGrid />
      </section>
    </div>
  )
}


