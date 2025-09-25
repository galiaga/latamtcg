"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import CardImage from '@/components/CardImage'
import Link from 'next/link'
import { printingHref } from '@/lib/routes'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Item = {
  kind: 'printing' | 'group'
  id?: string
  groupId?: string
  title: string
  variantLabel?: string | null
  finishLabel?: string | null
  setCode?: string
  setName?: string | null
  collectorNumber?: string | number | null
  imageNormalUrl?: string | null
  priceUsd?: number | string | null
  priceUsdFoil?: number | string | null
  priceUsdEtched?: number | string | null
}

export default function SearchResultsGrid({ initialQuery }: { initialQuery?: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initialQuery ?? '')
  const [primary, setPrimary] = useState<Item[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalResults: 0, nextPageToken: null as string | null })
  const [loading, setLoading] = useState(false)
  const visibleSets = useMemo(() => {
    const map = new Map<string, string>()
    for (const i of primary) {
      const code = String(i.setCode || '').toUpperCase()
      if (!code) continue
      const name = String(i.setName || code)
      if (!map.has(code)) map.set(code, name)
    }
    return Array.from(map.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [primary])
  const [openFacet, setOpenFacet] = useState<null | 'sets' | 'rarity' | 'printing'>(null)
  const barRef = useRef<HTMLDivElement | null>(null)
  const setsRef = useRef<HTMLDivElement | null>(null)
  const rarityRef = useRef<HTMLDivElement | null>(null)
  const printingRef = useRef<HTMLDivElement | null>(null)

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
    return Math.max(1, Math.ceil(meta.totalResults / Math.max(1, meta.pageSize)))
  }, [meta.totalResults, meta.pageSize])

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
    if (!q.trim()) { setPrimary([]); setLoading(false); setMeta((m) => ({ ...m, page: 1, totalResults: 0 })); return }
    setLoading(true)
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const url = new URL('/api/search', window.location.origin)
        url.searchParams.set('q', q)
        url.searchParams.set('page', String(pageParam))
        url.searchParams.set('limit', '25')
        // propagate filters
        const printing = searchParams?.getAll('printing') || []
        printing.forEach((p) => url.searchParams.append('printing', p))
        const rarity = searchParams?.getAll('rarity') || []
        rarity.forEach((r) => url.searchParams.append('rarity', r))
        const set = searchParams?.get('set')
        if (set) url.searchParams.set('set', set)
    // no grouping toggle; show raw results
        const res = await fetch(url, { signal: controller.signal })
        const json = await res.json()
        const arr = Array.isArray(json?.primary) ? json.primary : []
        setPrimary(arr)
        setMeta({ page: Number(json?.page || pageParam || 1), pageSize: Number(json?.pageSize || 25), totalResults: Number(json?.totalResults || 0), nextPageToken: json?.nextPageToken || null })
      } catch {}
      setLoading(false)
    }, 200)
    return () => { clearTimeout(t); controller.abort() }
  }, [q, searchParams])

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

  function updateFilter(name: 'printing' | 'set' | 'rarity', value: string | string[]) {
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
    }
    console.log(JSON.stringify({ event: 'search.filter_changed', filters: currentFilters() }))
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('q', q)
    params.delete('printing')
    params.delete('rarity')
    params.delete('set')
    console.log(JSON.stringify({ event: 'search.filter_changed', filters: { printing: [], rarity: [], set: '' } }))
    router.push(`${pathname}?${params.toString()}`)
  }

  // No remote sets list; build menu from visible results

  if (!q.trim()) return null

  return (
    <div className="mt-2">
      {/* Chip-based filter bar */}
      <div ref={barRef} className="mb-2 flex items-center gap-2 flex-wrap overflow-visible relative z-30">
        {(() => {
          const printing = searchParams?.getAll('printing') || []
          const rarities = searchParams?.getAll('rarity') || []
          const setsSel = (searchParams?.getAll('set') || []).map((s) => s.toUpperCase())
          const setsLabel = (() => {
            if (setsSel.length === 0) return 'Sets'
            const first = visibleSets.find((s) => setsSel[0] === s.code.toUpperCase())?.name || setsSel[0]
            const rest = setsSel.length - 1
            return rest > 0 ? `${first} +${rest}` : first
          })()
          const rarityLabel = rarities.length === 0 ? 'Rarity' : `${rarities[0].charAt(0).toUpperCase() + rarities[0].slice(1)}${rarities.length > 1 ? ` +${rarities.length - 1}` : ''}`
          const printLabel = printing.length === 0 ? 'Printings' : `${printing[0].charAt(0).toUpperCase() + printing[0].slice(1)}${printing.length > 1 ? ` +${printing.length - 1}` : ''}`
          return (
            <>
              <div ref={setsRef} className="relative">
                <button type="button"
                  className={`chip ${setsSel.length > 0 ? 'chip-primary' : ''}`}
                  aria-expanded={openFacet === 'sets'}
                  aria-controls="facet-sets"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFacet(openFacet === 'sets' ? null : 'sets') }}
                >
                  {setsLabel} <span>▼</span>
                </button>
                {openFacet === 'sets' && (
                  <div id="facet-sets" className="absolute left-0 top-full mt-2 w-[min(360px,92vw)] popover p-3" style={{ zIndex: 1000 }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Sets</div>
                      <button type="button" className="btn btn-ghost text-sm" onClick={() => updateFilter('set', [])}>Clear</button>
                    </div>
                    <div className="max-h-56 overflow-auto no-scrollbar flex flex-col gap-1">
                      {visibleSets.map((s) => {
                        const selected = (searchParams?.getAll('set') || []).map((x) => x.toUpperCase()).includes(s.code.toUpperCase())
                        const toggle = () => {
                          const cur = new Set((searchParams?.getAll('set') || []).map((x) => x.toUpperCase()))
                          const key = s.code.toUpperCase()
                          if (selected) cur.delete(key); else cur.add(key)
                          updateFilter('set', Array.from(cur))
                        }
                        const count = primary.filter((i) => (String(i.setCode || '').toUpperCase()) === s.code.toUpperCase()).length
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
                  className={`chip ${rarities.length > 0 ? 'chip-primary' : ''}`}
                  aria-expanded={openFacet === 'rarity'}
                  aria-controls="facet-rarity"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFacet(openFacet === 'rarity' ? null : 'rarity') }}
                >
                  {rarityLabel} <span>▼</span>
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
                        const count = primary.filter((i) => ((i as any).rarity || '').toLowerCase() === opt.key).length
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
                  className={`chip ${printing.length > 0 ? 'chip-primary' : ''}`}
                  aria-expanded={openFacet === 'printing'}
                  aria-controls="facet-printing"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFacet(openFacet === 'printing' ? null : 'printing') }}
                >
                  {printLabel} <span>▼</span>
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
                        const count = primary.filter((i) => {
                          const f = String(i.finishLabel || '').toLowerCase()
                          if (opt.key === 'etched') return f.includes('etched')
                          if (opt.key === 'foil') return f.includes('foil') && !f.includes('etched')
                          return f === '' || f === 'standard' || f === 'nonfoil' || f === 'normal'
                        }).length
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
              <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear Filters</button>
            </>
          )
        })()}
      </div>
      {/* Always-visible compact filter controls */}
      {/* All-filters popover removed */}
      {loading && primary.length === 0 ? (
        <div className="text-sm" style={{ color: 'var(--mutedText)' }}>Loading…</div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {primary.map((item) => {
          const href = item.id ? printingHref(item.id) : '#'
          const price = (() => {
            const v = (item.priceUsdEtched ?? item.priceUsdFoil ?? item.priceUsd) as any
            if (v === null || v === undefined) return '—'
            const n = Number(v)
            if (Number.isNaN(n)) return '—'
            const ceilVal = Math.ceil(n)
            return `$${ceilVal}`
          })()
          const chips = (() => {
            const out: Array<{ key: string; label: string }> = []
            const finish = String(item.finishLabel || '')
            if (finish && finish !== 'Standard') {
              const norm = finish.toLowerCase()
              if (norm.includes('etched')) out.push({ key: 'etched', label: 'Etched 💎' })
              else if (norm.includes('foil')) out.push({ key: 'foil', label: 'Foil ✨' })
              else out.push({ key: 'normal', label: 'Normal' })
            } else if (finish === '' || finish === 'Standard') {
              out.push({ key: 'normal', label: 'Normal' })
            }
            const variant = String(item.variantLabel || '')
            if (variant) {
              const v = variant.replace(/Full Art/gi, 'Full Art').replace(/Extended Art/gi, 'Extended Art')
              out.push({ key: 'variant', label: v })
            }
            return out.length > 3 ? [...out.slice(0, 3), { key: 'more', label: `+${out.length - 3}` }] : out
          })()
          return (
            <Link key={`${item.id || item.groupId}-${item.title}`} href={href} className="card card-2xl p-2 hover-glow-purple transition-soft" style={{ transform: 'translateZ(0)' }}>
              <div className="w-full flex items-center justify-center">
                {item.imageNormalUrl ? (
                  <CardImage mode="thumb" src={item.imageNormalUrl} alt={`${item.title} · ${item.setName || (item.setCode || '').toUpperCase()} #${item.collectorNumber || ''}`} width={160} />
                ) : (
                  <div className="relative aspect-[3/4] w-full skeleton" />
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium truncate">
                  {(() => {
                    const title = String(item.title || '').replace(/\(Full Art\)/gi, '(Borderless)')
                    const parts: string[] = []
                    // Keep title clean; chips show details
                    return parts.length ? `${title} (${parts.join(', ')})` : title
                  })()}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--mutedText)' }}>
                  {(() => {
                    const code = (item.setCode || '').toString().toUpperCase()
                    const left = item.setName || code
                    const num = item.collectorNumber ? ` #${item.collectorNumber}` : ''
                    return `${left}${num}`
                  })()}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-sm" style={{ color: price === '—' ? 'var(--mutedText)' : 'var(--primary)' }}>{price}</div>
                  <span className="text-xs" title="Prices shown are market proxies. Final checkout shows CLP with VAT + import + shipping options." aria-label="Pricing info" style={{ color: 'var(--mutedText)' }}>ⓘ</span>
                </div>
                {chips.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {chips.map((c, idx) => (
                      <span key={`${c.key}-${idx}`} className="badge" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}>{c.label}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
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
          disabled={loading || meta.page * meta.pageSize >= meta.totalResults}
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
  )
}


