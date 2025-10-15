"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { SWRConfig } from 'swr'
import CardTile, { convertSearchItemToCardTile } from '@/components/CardTile'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { printingHref } from '@/lib/routes'
import { formatUsd } from '@/lib/format'
import { buildCacheKey } from '@/lib/cache'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import SkeletonCard from './SkeletonCard'
import Spinner from './Spinner'

type Item = {
  kind: 'printing' | 'group'
  id?: string
  groupId?: string
  title: string
  variantLabel?: string | null
  finishLabel?: string | null
  variantSuffix?: string | null
  setCode?: string
  setName?: string | null
  collectorNumber?: string | number | null
  imageNormalUrl?: string | null
  priceUsd?: number | string | null
  priceUsdFoil?: number | string | null
  priceUsdEtched?: number | string | null
}

type InitialData = {
  page?: number
  pageSize?: number
  totalResults?: number
  nextPageToken?: string | null
  primary?: any[]
  facets?: { sets: Array<{ code: string; name: string; count: number }>; rarity: Array<{ key: string; count: number }>; printing: Array<{ key: string; count: number }> }
}

export default function SearchResultsGrid({ initialQuery, initialData, initialKey }: { initialQuery?: string; initialData?: InitialData | null; initialKey?: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initialQuery ?? '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
  const [primary, setPrimary] = useState<Item[]>(Array.isArray(initialData?.primary) ? (initialData?.primary as any) : [])
  const [meta, setMeta] = useState({ page: Number(initialData?.page || 1), pageSize: Number(initialData?.pageSize || 25), totalResults: Number(initialData?.totalResults || 0), nextPageToken: (initialData?.nextPageToken ?? null) as string | null })
  const [facets, setFacets] = useState<{ sets: Array<{ code: string; name: string; count: number }>; rarity: Array<{ key: string; count: number }>; printing: Array<{ key: string; count: number }> }>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
    sets: Array.isArray(initialData?.facets?.sets) ? (initialData!.facets!.sets as any) : [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
    rarity: Array.isArray(initialData?.facets?.rarity) ? (initialData!.facets!.rarity as any) : [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
    printing: Array.isArray(initialData?.facets?.printing) ? (initialData!.facets!.printing as any) : [],
  })
  const [loading, setLoading] = useState(false)
  const hasAnyFilter = useMemo(() => {
    const sets = searchParams?.getAll('set') || []
    const rarity = searchParams?.getAll('rarity') || []
    const printing = searchParams?.getAll('printing') || []
    return sets.length > 0 || rarity.length > 0 || printing.length > 0
  }, [searchParams])
  const [openFacet, setOpenFacet] = useState<null | 'sets' | 'rarity' | 'printing'>(null)
  const barRef = useRef<HTMLDivElement | null>(null)
  const setsRef = useRef<HTMLDivElement | null>(null)
  const rarityRef = useRef<HTMLDivElement | null>(null)
  const printingRef = useRef<HTMLDivElement | null>(null)

  const DeferredChips = useMemo(() => dynamic(() => import('./_islands/DeferredChips'), { ssr: false, loading: () => null }), [])
  const AddToCartButton = useMemo(() => dynamic(() => import('./AddToCartButton'), { ssr: false, loading: () => null }), [])

  useEffect(() => {
    function onDocKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpenFacet(null) }
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node
      if (!barRef.current) return
      const containers = [barRef.current, setsRef.current, rarityRef.current, printingRef.current].filter(Boolean) as HTMLElement[]
      if (containers.some((el) => el.contains(t))) return
      setOpenFacet(null)
    }
    document.addEventListener('keydown', onDocKey)
    document.addEventListener('click', onDocClick)
    return () => { document.removeEventListener('keydown', onDocKey); document.removeEventListener('click', onDocClick) }
  }, [])

  const totalPages = useMemo(() => {
    const per = Math.max(1, meta.pageSize)
    if (meta.totalResults && meta.totalResults > 0) {
      return Math.max(1, Math.ceil(meta.totalResults / per))
    }
    // Fallback: if no total but we have a next page, show current + 1
    return meta.page + (meta.nextPageToken ? 1 : 0)
  }, [meta.totalResults, meta.pageSize, meta.page, meta.nextPageToken])

  const pageItems = useMemo(() => {
    const current = meta.page
    const total = totalPages
    const nums: number[] = []
    const add = (n: number) => { if (n >= 1 && n <= total && !nums.includes(n)) nums.push(n) }
    add(1)
    add(2)
    add(current - 1)
    add(current)
    add(current + 1)
    add(total - 1)
    add(total)
    nums.sort((a, b) => a - b)
    const out: Array<number | '…'> = []
    for (let i = 0; i < nums.length; i++) {
      if (i === 0) {
        out.push(nums[i])
      } else {
        if (nums[i] - (nums[i - 1] || 0) > 1) out.push('…')
        out.push(nums[i])
      }
    }
    return out
  }, [meta.page, totalPages])

  useEffect(() => {
    // React to URL changes (router.push on same page)
    const qParam = searchParams?.get('q')
    if (qParam === null && initialQuery) {
      setQ(initialQuery)
      return
    }
    setQ(qParam || '')
  }, [searchParams, initialQuery])

  useEffect(() => {
    const pageParam = parseInt(String(searchParams?.get('page') || '1'), 10) || 1
    if (!q.trim() && !hasAnyFilter) { setPrimary([]); setLoading(false); setMeta((m) => ({ ...m, page: 1, totalResults: 0 })); return }
    // Build cache key and suppress fetch entirely if SSR provided matching data
    const printing = searchParams?.getAll('printing') || []
    const rarity = searchParams?.getAll('rarity') || []
    const sets = (searchParams?.getAll('set') || []).map((s) => String(s).toUpperCase())
    const sort = String(searchParams?.get('sort') || 'relevance')
    const cacheKey = buildCacheKey({ q, page: pageParam, printing: printing.slice().sort(), rarity: rarity.slice().sort(), sets: sets.slice().sort(), sort })
    if (initialKey && initialData && cacheKey === initialKey) {
      if (process.env.NODE_ENV !== 'production') console.debug('[search] mount fetch suppressed (SSR data reused)', { cacheKey })
      // Hydrate state from SSR payload immediately and skip client fetch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
      setPrimary(Array.isArray(initialData.primary) ? (initialData.primary as any) : [])
      setMeta({ page: Number(initialData.page || pageParam || 1), pageSize: Number(initialData.pageSize || 25), totalResults: Number(initialData.totalResults || 0), nextPageToken: initialData.nextPageToken || null })
      setFacets({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
        sets: Array.isArray(initialData.facets?.sets) ? (initialData.facets!.sets as any) : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
        rarity: Array.isArray(initialData.facets?.rarity) ? (initialData.facets!.rarity as any) : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
        printing: Array.isArray(initialData.facets?.printing) ? (initialData.facets!.printing as any) : [],
      })
      setLoading(false)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const url = new URL('/api/search', window.location.origin)
        url.searchParams.set('q', q)
        url.searchParams.set('page', String(pageParam))
        url.searchParams.set('limit', '25')
        // propagate filters
        printing.forEach((p) => url.searchParams.append('printing', p))
        rarity.forEach((r) => url.searchParams.append('rarity', r))
        sets.forEach((s) => url.searchParams.append('set', s))
        if (sort) url.searchParams.set('sort', sort)
    // no grouping toggle; show raw results
        if (initialKey && initialData && cacheKey === initialKey) {
          if (process.env.NODE_ENV !== 'production') console.debug('[search] client fetch suppressed (SSR cache hit)', { cacheKey })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
          setPrimary(Array.isArray(initialData.primary) ? (initialData.primary as any) : [])
          setMeta({ page: Number(initialData.page || pageParam || 1), pageSize: Number(initialData.pageSize || 25), totalResults: Number(initialData.totalResults || 0), nextPageToken: initialData.nextPageToken || null })
          setFacets({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
            sets: Array.isArray(initialData.facets?.sets) ? (initialData.facets!.sets as any) : [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
            rarity: Array.isArray(initialData.facets?.rarity) ? (initialData.facets!.rarity as any) : [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hydrate from SSR blob
            printing: Array.isArray(initialData.facets?.printing) ? (initialData.facets!.printing as any) : [],
          })
          setLoading(false)
          return
        }

        const res = await fetch(url, { signal: controller.signal, headers: { 'accept': 'application/json', 'x-cache-key': cacheKey } })
        const json = await res.json()
        const arr = Array.isArray(json?.primary) ? json.primary : []
        setPrimary(arr)
        setMeta({ page: Number(json?.page || pageParam || 1), pageSize: Number(json?.pageSize || 25), totalResults: Number(json?.totalResults || 0), nextPageToken: json?.nextPageToken || null })
        setFacets({
          sets: Array.isArray(json?.facets?.sets) ? json.facets.sets : [],
          rarity: Array.isArray(json?.facets?.rarity) ? json.facets.rarity : [],
          printing: Array.isArray(json?.facets?.printing) ? json.facets.printing : [],
        })
      } catch {}
      setLoading(false)
    }, 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [q, searchParams, hasAnyFilter, initialData, initialKey])

  function setPage(nextPage: number) {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('q', q)
    params.set('page', String(Math.max(1, nextPage)))
    console.log(JSON.stringify({ event: 'search.page_changed', page: nextPage, filters: currentFilters() }))
    router.push(`${pathname}?${params.toString()}`)
  }

  function currentFilters() {
    const printing = searchParams?.getAll('printing') || []
    const set = searchParams?.get('set') || ''
    const rarity = searchParams?.getAll('rarity') || []
    return { printing, set, rarity }
  }

  function updateFilter(name: 'printing' | 'set' | 'rarity' | 'showUnavailable', value: string | string[]) {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('q', q)
    params.set('page', '1')
    if (name === 'printing') {
      params.delete('printing')
      ;(value as string[]).forEach((v) => params.append('printing', v))
    } else if (name === 'rarity') {
      params.delete('rarity')
      ;(value as string[]).forEach((v) => params.append('rarity', v))
    } else if (name === 'set') {
      params.delete('set')
      ;(Array.isArray(value) ? value : [value]).forEach((v) => { const vv = String(v || '').trim(); if (vv) params.append('set', vv) })
    } else if (name === 'showUnavailable') {
      if (Array.isArray(value) && value.length > 0) {
        params.set('showUnavailable', 'true')
      } else {
        params.delete('showUnavailable')
      }
    }
    console.log(JSON.stringify({ event: 'search.filter_changed', filters: currentFilters() }))
    router.push(`${pathname}?${params.toString()}`)
  }

  function setSort(next: 'relevance' | 'price_asc' | 'price_desc' | 'name' | 'release_desc') {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('q', q)
    params.set('page', '1')
    params.set('sort', next)
    console.log(JSON.stringify({ event: 'search.sort_changed', sort: next }))
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('q', q)
    params.delete('printing')
    params.delete('rarity')
    params.delete('set')
    params.delete('showUnavailable') // Also clear the showUnavailable filter
    console.log(JSON.stringify({ event: 'search.filter_changed', filters: { printing: [], rarity: [], set: '' } }))
    router.push(`${pathname}?${params.toString()}`)
  }

  // Build menu from server-provided facets over the full result set

  if (!q.trim() && !hasAnyFilter) return null

  return (
    <SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: false, refreshInterval: 0, dedupingInterval: 4000 }}>
    <div className="mt-2">
      {/* Chip-based filter bar */}
      <div id="search-filter-bar" ref={barRef} className="mb-2 flex items-center gap-2 flex-wrap overflow-visible relative z-30">
        {(() => {
          const printing = searchParams?.getAll('printing') || []
          const rarities = searchParams?.getAll('rarity') || []
          const setsSel = (searchParams?.getAll('set') || []).map((s) => s.toUpperCase())
          const setsLabel = (() => {
            if (setsSel.length === 0) return 'Sets'
            const first = (facets.sets || []).find((s) => setsSel[0] === s.code.toUpperCase())?.name || setsSel[0]
            const rest = setsSel.length - 1
            return rest > 0 ? `${first} +${rest}` : first
          })()
          const rarityLabel = rarities.length === 0 ? 'Rarity' : `${rarities[0].charAt(0).toUpperCase() + rarities[0].slice(1)}${rarities.length > 1 ? ` +${rarities.length - 1}` : ''}`
          const printLabel = printing.length === 0 ? 'Printings' : `${printing[0].charAt(0).toUpperCase() + printing[0].slice(1)}${printing.length > 1 ? ` +${printing.length - 1}` : ''}`
          return (
            <>
              <div ref={setsRef} className="relative">
                <button type="button"
                  className={`chip ${setsSel.length > 0 ? 'chip-primary' : ''} ${loading ? 'opacity-50' : ''}`}
                  aria-expanded={openFacet === 'sets'}
                  aria-controls="facet-sets"
                  disabled={loading}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFacet(openFacet === 'sets' ? null : 'sets') }}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" />
                      <span className="ml-1">Sets</span>
                    </>
                  ) : (
                    <>
                      {setsLabel} <span>▼</span>
                    </>
                  )}
                </button>
                {openFacet === 'sets' && (
                  <div id="facet-sets" className="absolute left-0 top-full mt-2 w-[min(360px,92vw)] popover p-3" style={{ zIndex: 1000 }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Sets</div>
                      <button type="button" className="btn btn-ghost text-sm" onClick={() => updateFilter('set', [])}>Clear</button>
                    </div>
                    <div className="max-h-56 overflow-auto no-scrollbar flex flex-col gap-1">
                      {(facets.sets || []).map((s) => {
                        const selected = (searchParams?.getAll('set') || []).map((x) => x.toUpperCase()).includes(s.code.toUpperCase())
                        const toggle = () => {
                          const cur = new Set((searchParams?.getAll('set') || []).map((x) => x.toUpperCase()))
                          const key = s.code.toUpperCase()
                          if (selected) cur.delete(key); else cur.add(key)
                          updateFilter('set', Array.from(cur))
                        }
                        const count = s.count
                        if (count === 0) return null
                        return (
                          <label key={s.code} data-name={s.name.toLowerCase()} className="flex items-center justify-between gap-2 text-sm">
                            <span className="inline-flex items-center gap-2">
                              <input type="checkbox" checked={selected} onChange={toggle} />
                              <span className="truncate" title={s.name}>{s.name}</span>
                            </span>
                            <span className="text-xs" style={{ color: 'var(--mutedText)' }}>{count}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div ref={rarityRef} className="relative">
                <button type="button"
                  className={`chip ${rarities.length > 0 ? 'chip-primary' : ''} ${loading ? 'opacity-50' : ''}`}
                  aria-expanded={openFacet === 'rarity'}
                  aria-controls="facet-rarity"
                  disabled={loading}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFacet(openFacet === 'rarity' ? null : 'rarity') }}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" />
                      <span className="ml-1">Rarity</span>
                    </>
                  ) : (
                    <>
                      {rarityLabel} <span>▼</span>
                    </>
                  )}
                </button>
                {openFacet === 'rarity' && (
                  <div id="facet-rarity" className="absolute left-0 top-full mt-2 w-[min(280px,92vw)] popover p-3" style={{ zIndex: 1000 }}>
                    <div className="flex items-center justify-between mb-2"><div className="text-sm font-medium">Rarity</div><button type="button" className="btn btn-ghost text-sm" onClick={() => updateFilter('rarity', [])}>Clear</button></div>
                    <div className="flex flex-col gap-1">
                      {[
                        { key: 'common', label: 'Common' },
                        { key: 'uncommon', label: 'Uncommon' },
                        { key: 'rare', label: 'Rare' },
                        { key: 'mythic', label: 'Mythic' },
                      ].map((opt) => {
                        const selected = (searchParams?.getAll('rarity') || []).includes(opt.key)
                        const toggle = () => {
                          const cur = new Set(searchParams?.getAll('rarity') || [])
                          if (selected) cur.delete(opt.key); else cur.add(opt.key)
                          updateFilter('rarity', Array.from(cur))
                        }
                        const count = (facets.rarity || []).find((r) => r.key === opt.key)?.count || 0
                        if (count === 0) return null
                        return (
                          <label key={opt.key} className="flex items-center justify-between gap-2 text-sm">
                            <span className="inline-flex items-center gap-2"><input type="checkbox" checked={selected} onChange={toggle} />{opt.label}</span>
                            <span className="text-xs" style={{ color: 'var(--mutedText)' }}>{count}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div ref={printingRef} className="relative">
                <button type="button"
                  className={`chip ${printing.length > 0 ? 'chip-primary' : ''} ${loading ? 'opacity-50' : ''}`}
                  aria-expanded={openFacet === 'printing'}
                  aria-controls="facet-printing"
                  disabled={loading}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFacet(openFacet === 'printing' ? null : 'printing') }}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" />
                      <span className="ml-1">Printings</span>
                    </>
                  ) : (
                    <>
                      {printLabel} <span>▼</span>
                    </>
                  )}
                </button>
                {openFacet === 'printing' && (
                  <div id="facet-printing" className="absolute left-0 top-full mt-2 w-[min(280px,92vw)] popover p-3" style={{ zIndex: 1000 }}>
                    <div className="flex items-center justify-between mb-2"><div className="text-sm font-medium">Printings</div><button type="button" className="btn btn-ghost text-sm" onClick={() => updateFilter('printing', [])}>Clear</button></div>
                    <div className="flex flex-col gap-1">
                      {[
                        { key: 'normal', label: 'Normal' },
                        { key: 'foil', label: 'Foil' },
                        { key: 'etched', label: 'Etched' },
                      ].map((opt) => {
                        const selected = (searchParams?.getAll('printing') || []).includes(opt.key)
                        const toggle = () => {
                          const cur = new Set(searchParams?.getAll('printing') || [])
                          if (selected) cur.delete(opt.key); else cur.add(opt.key)
                          updateFilter('printing', Array.from(cur))
                        }
                        const count = (facets.printing || []).find((r) => r.key === opt.key)?.count || 0
                        if (count === 0) return null
                        return (
                          <label key={opt.key} className="flex items-center justify-between gap-2 text-sm">
                            <span className="inline-flex items-center gap-2"><input type="checkbox" checked={selected} onChange={toggle} />{opt.label}</span>
                            <span className="text-xs" style={{ color: 'var(--mutedText)' }}>{count}</span>
                          </label>
                        )
                      })}
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input 
                          type="checkbox" 
                          checked={searchParams?.get('showUnavailable') === 'true'} 
                          onChange={(e) => updateFilter('showUnavailable', e.target.checked ? ['true'] : [])} 
                        />
                        Show unavailable items
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <button type="button" className="chip" onClick={clearFilters} disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    <span className="ml-2">Clearing...</span>
                  </>
                ) : (
                  'Clear Filters'
                )}
              </button>
              {/* Sort control moved to the right */}
              {(() => {
                const current = String(searchParams?.get('sort') || 'relevance')
                return (
                  <div className="ml-auto flex items-center gap-2">
                    <label htmlFor="sort-select" className="text-sm hidden md:block" style={{ color: 'var(--mutedText)' }}>Sort by:</label>
                    <select
                      id="sort-select"
                      className={`chip ${loading ? 'opacity-50' : ''}`}
                      value={current}
                      onChange={(e) => setSort(e.target.value as any)}
                      disabled={loading}
                      aria-label="Sort results"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="name_asc">Name: A → Z</option>
                      <option value="name_desc">Name: Z → A</option>
                      <option value="price_asc">Price: Low → High</option>
                      <option value="price_desc">Price: High → Low</option>
                    </select>
                  </div>
                )
              })()}
            </>
          )
        })()}
      </div>
      {/* Always-visible compact filter controls */}
      {/* All-filters popover removed */}
      {loading && primary.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : null}
      {!loading && meta.totalResults === 0 && q.trim() ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4" style={{ color: 'var(--mutedText)' }}>🔍</div>
          <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>No items found</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--mutedText)' }}>
            Looks like "<span className="font-medium">{q}</span>" got exiled from our collection! 📦
          </p>
          <div className="text-xs" style={{ color: 'var(--mutedText)' }}>
            <p className="mb-2">Try these search strategies to find what you're looking for:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Item name (e.g., "Lightning Bolt")</li>
              <li>Partial name (e.g., "Lightning")</li>
              <li>Set code (e.g., "SLD")</li>
              <li>Artist or creator name</li>
            </ul>
            <p className="mt-3 text-xs italic" style={{ color: 'var(--mutedText)' }}>
              💡 Pro tip: Sometimes the best cards are hiding in plain sight!
            </p>
          </div>
        </div>
      ) : null}
      {/* Total results count */}
      {!loading && meta.totalResults > 0 && q.trim() ? (
        <div className="mb-4 text-sm" style={{ color: 'var(--mutedText)' }}>
          Showing {primary.length} of {meta.totalResults.toLocaleString()} results
        </div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-6">
          {primary.map((item) => {
          const href = item.id ? printingHref(item.id) : '#'
          const price = (() => {
            // Show price based on selected printing filter
            const printingSel = searchParams?.getAll('printing') || []
            
            // If only one printing type is selected, show that specific price
            if (printingSel.length === 1) {
              const selected = printingSel[0]
              const v = selected === 'etched' ? item.priceUsdEtched : 
                       selected === 'foil' ? item.priceUsdFoil : 
                       item.priceUsd
              return formatUsd(v)
            }
            
            // Multiple or no printing filters: use Normal → Foil → Etched priority
            const order = [item.priceUsd, item.priceUsdFoil, item.priceUsdEtched]
            const v = order.find((x) => typeof x === 'number' && !Number.isNaN(Number(x))) ?? null
            return formatUsd(v)
          })()
          const chips = (() => {
            const out: Array<{ key: string; label: string }> = []
            // No chips - variant information is already in the title via variantSuffix
            return out
          })()
          return (
            <CardTile
              key={`${item.id || item.groupId}-${item.title}`}
              {...convertSearchItemToCardTile(item, href)}
            />
          )
          })}
      </div>
      {/* Numbered pagination */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          className="btn btn-sm"
          aria-label="Previous page"
          disabled={meta.page <= 1 || loading}
          onClick={() => setPage(meta.page - 1)}
        >
          ‹
        </button>
        {pageItems.map((p, idx) => (
          p === '…' ? (
            <span key={`ellipsis-${idx}`} className="px-2" style={{ color: 'var(--mutedText)' }}>…</span>
          ) : (
            <button
              key={`page-${p}`}
              className={p === meta.page ? 'btn btn-sm btn-gradient' : 'btn btn-sm'}
              aria-current={p === meta.page ? 'page' : undefined}
              disabled={loading || p === meta.page}
              onClick={() => setPage(p as number)}
            >
              {p}
            </button>
          )
        ))}
        <button
          className="btn btn-sm btn-gradient"
          aria-label="Next page"
          disabled={loading || !meta.nextPageToken}
          onClick={() => setPage(meta.page + 1)}
        >
          ›
        </button>
      </div>
      {/* Prefetch next page */}
      {meta.page * meta.pageSize < meta.totalResults ? (
        <Link href={`${pathname}?${(() => { const p = new URLSearchParams(searchParams?.toString() || ''); p.set('page', String(meta.page + 1)); return p.toString() })()}`} prefetch className="hidden">next</Link>
      ) : null}
    </div>
    </SWRConfig>
  )
}


