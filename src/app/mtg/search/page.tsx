import SearchResultsGrid from '@/components/SearchResultsGrid'
import SafeClient from '@/components/SafeClient'
import { groupedSearch } from '@/services/searchQueryGrouped'
import { parseSortParam } from '@/search/sort'
import HydrationPerf from '@/components/HydrationPerf'

export const metadata = {
  robots: { index: false, follow: true },
  title: 'Search MTG',
}

export default async function MtgSearchPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const t0 = Date.now()
  const params = await searchParams
  const q = String(params.q || '')
  const page = parseInt(String(params.page || '1'), 10) || 1
  const printing = Array.isArray(params.printing) ? params.printing.map(String) : (params.printing ? [String(params.printing)] : [])
  const rarity = Array.isArray(params.rarity) ? params.rarity.map(String) : (params.rarity ? [String(params.rarity)] : [])
  const sets = Array.isArray(params.set) ? params.set.map((s) => String(s)) : (params.set ? [String(params.set)] : [])
  const sort = parseSortParam(params.sort)

  const hasAnyFilter = (q || '').trim().length > 0 || printing.length > 0 || rarity.length > 0 || sets.length > 0
  const initialKey = JSON.stringify({ q, page, printing: printing.slice().sort(), rarity: rarity.slice().sort(), sets: sets.slice().sort(), sort })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- initialData comes from service; kept as loose for SSR payload
  let initialData: any = null
  if (hasAnyFilter) {
    try {
      const t0 = Date.now()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- service accepts typed params; shortcut cast for SSR setup
      initialData = await groupedSearch({ q, page, pageSize: 25, printing: printing as any, rarity: rarity as any, sets, sort })
      const t1 = Date.now()
      try { console.log(JSON.stringify({ event: 'search.ssr_fetch', key: initialKey, latencyMs: t1 - t0, returned: Array.isArray(initialData?.primary) ? initialData.primary.length : 0, total: initialData?.totalResults || 0 })) } catch {}
    } catch (e) {
      try { console.error('[search] ssr fetch failed', e) } catch {}
    }
  } else {
    try { console.log(JSON.stringify({ event: 'search.ssr_skip', key: initialKey })) } catch {}
  }

  const t1 = Date.now()
  try { console.log(JSON.stringify({ event: 'page.render', route: '/mtg/search', ms: t1 - t0 })) } catch {}

  return (
    <div className="py-2">
      <section className="px-4">
        {/* mark hydration start for client measure */}
        <script dangerouslySetInnerHTML={{ __html: "try{performance.mark('mtg-search-hydrate-start')}catch(e){}" }} />
        <HydrationPerf />
        <SafeClient>
          <SearchResultsGrid initialQuery={q} initialData={initialData} initialKey={initialKey} />
        </SafeClient>
      </section>
    </div>
  )
}


