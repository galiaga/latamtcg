import SearchBox from '@/components/SearchBox'
import SafeClient from '@/components/SafeClient'

export default function MtgSearchPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Search Magic: The Gathering</h1>
        <div className="ml-auto" />
      </div>
      <SafeClient>
        <SearchBox />
      </SafeClient>
      <div className="p-8 rounded border border-dashed" style={{ borderColor: 'var(--border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--mutedText)' }}>Type a card name (e.g., "Tataru Taru") to see all printings.</p>
      </div>
    </div>
  )
}


