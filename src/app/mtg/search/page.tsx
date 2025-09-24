import SearchBox from '@/components/SearchBox'
import SearchResultsGrid from '@/components/SearchResultsGrid'

export const metadata = {
  robots: { index: false, follow: true },
  title: 'Search MTG | LatamTCG',
}

export default function MtgSearchPage() {
  return (
    <div className="p-6">
      <section className="max-w-4xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.01em' }}>Search Magic: The Gathering</h1>
        <p className="mt-2" style={{ color: 'var(--mutedText)' }}>Find any printing, variant, or language.</p>
        <div className="mt-6 flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <SearchBox />
          </div>
        </div>
        <div className="mt-4 flex gap-2 justify-center flex-wrap">
          {['Black Lotus','Lightning Bolt','Teferi\'s Protection','Sol Ring'].map((q) => (
            <a key={q} className="badge transition-soft hover-glow-purple" href={`/mtg/search?q=${encodeURIComponent(q)}`}>{q}</a>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto">
        <SearchResultsGrid />
      </section>
    </div>
  )
}


