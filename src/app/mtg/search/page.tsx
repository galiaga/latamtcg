import SearchBox from '@/components/SearchBox'

export const metadata = {
  robots: { index: false, follow: true },
  title: 'Search MTG | LatamTCG',
}

export default function MtgSearchPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Search Magic: The Gathering</h1>
      <SearchBox />
      <div className="p-8 rounded border border-dashed" style={{ borderColor: 'var(--border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--mutedText)' }}>Type a card name (e.g., "Tataru Taru") to see all printings.</p>
      </div>
    </div>
  )
}


