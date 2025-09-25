"use client"

import { useEffect, useMemo, useState } from 'react'
import CardImage from '@/components/CardImage'
import Link from 'next/link'
import { printingHref } from '@/lib/routes'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Item = {
  kind: 'printing' | 'group'
  id?: string
  title: string
  variantLabel?: string | null
  finishLabel?: string | null
  setCode?: string
  setName?: string | null
  collectorNumber?: string | number | null
  imageNormalUrl?: string | null
  priceUsd?: number | string | null
}

export default function SearchResultsGrid({ initialQuery }: { initialQuery?: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initialQuery ?? '')
  const [primary, setPrimary] = useState<Item[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalResults: 0, nextPageToken: null as string | null })
  const [loading, setLoading] = useState(false)

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
    router.push(`${pathname}?${params.toString()}`)
  }

  if (!q.trim()) return null

  return (
    <div className="mt-6">
      {loading && primary.length === 0 ? (
        <div className="text-sm" style={{ color: 'var(--mutedText)' }}>Loading…</div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {primary.map((item) => {
          const href = item.id ? printingHref(item.id) : '#'
          const price = (() => {
            const v = item.priceUsd as any
            if (v === null || v === undefined) return '—'
            const n = Number(v)
            if (Number.isNaN(n)) return '—'
            return `$${n.toFixed(2)}`
          })()
          return (
            <Link key={`${item.id}-${item.title}`} href={href} className="card card-2xl p-2 hover-glow-purple transition-soft">
              <div className="w-full flex items-center justify-center">
                {item.imageNormalUrl ? (
                  <CardImage mode="thumb" src={item.imageNormalUrl} alt={item.title} width={160} />
                ) : (
                  <div className="relative aspect-[3/4] w-full skeleton" />
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium truncate">
                  {(() => {
                    const title = String(item.title || '').replace(/\(Full Art\)/gi, '(Borderless)')
                    const parts: string[] = []
                    if (item.variantLabel) parts.push(item.variantLabel)
                    if (item.finishLabel && item.finishLabel !== 'Standard') parts.push(item.finishLabel)
                    return parts.length ? `${title} (${parts.join(', ')})` : title
                  })()}
                </div>
                <div className="text-xs" style={{ color: 'var(--mutedText)' }}>
                  {item.setName || (item.setCode || '').toUpperCase()}
                </div>
                <div className="mt-1 text-sm" style={{ color: 'var(--primary)' }}>
                  {price}
                </div>
              </div>
            </Link>
          )
          })}
      </div>
      {/* Desktop/Tablet pagination with full numbers */}
      <div className="mt-4 hidden sm:flex items-center justify-between">
        <div className="text-sm" style={{ color: 'var(--mutedText)' }}>
          {(() => {
            const start = (meta.page - 1) * meta.pageSize + 1
            const end = Math.min(meta.page * meta.pageSize, meta.totalResults)
            if (meta.totalResults === 0) return 'No results'
            return `Showing ${start}-${end} of ${meta.totalResults} • Page ${meta.page} of ${totalPages}`
          })()}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm"
            disabled={meta.page <= 1 || loading}
            onClick={() => setPage(meta.page - 1)}
          >
            Previous
          </button>
          {pageItems.map((p, idx) => (
            p === '…' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-sm" style={{ color: 'var(--mutedText)' }}>…</span>
            ) : (
              <button
                key={`page-${p}`}
                className={p === meta.page ? 'btn btn-sm btn-gradient' : 'btn btn-sm'}
                disabled={loading || p === meta.page}
                onClick={() => setPage(p as number)}
              >
                {p}
              </button>
            )
          ))}
          <button
            className="btn btn-sm btn-gradient"
            disabled={loading || meta.page * meta.pageSize >= meta.totalResults}
            onClick={() => setPage(meta.page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Mobile compact pagination */}
      <div className="mt-4 flex sm:hidden items-center justify-between">
        <button
          className="btn btn-sm"
          disabled={meta.page <= 1 || loading}
          onClick={() => setPage(meta.page - 1)}
        >
          Prev
        </button>
        <div className="text-sm" style={{ color: 'var(--mutedText)' }}>
          Page {meta.page} of {totalPages}
        </div>
        <button
          className="btn btn-sm btn-gradient"
          disabled={loading || meta.page * meta.pageSize >= meta.totalResults}
          onClick={() => setPage(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}


