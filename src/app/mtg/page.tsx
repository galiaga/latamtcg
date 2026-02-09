import SearchBox from '@/components/SearchBox'
import SafeClient from '@/components/SafeClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Magic: The Gathering | LatamTCG',
  description: 'Explora y compra cartas de Magic: The Gathering. Todas las cartas, siempre.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://latamtcg.com/mtg',
  },
  openGraph: {
    title: 'Magic: The Gathering | LatamTCG',
    description: 'Explora y compra cartas de Magic: The Gathering. Todas las cartas, siempre.',
    url: 'https://latamtcg.com/mtg',
  },
}

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


