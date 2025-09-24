"use client"

import { useEffect, useMemo, useState } from 'react'
import CardImage from '@/components/CardImage'
import Link from 'next/link'
import { printingHref } from '@/lib/routes'
import { useSearchParams } from 'next/navigation'

type Item = {
  kind: 'printing' | 'group'
  id?: string
  title: string
  setCode?: string
  setName?: string | null
  collectorNumber?: string | number | null
  imageNormalUrl?: string | null
}

export default function SearchResultsGrid({ initialQuery }: { initialQuery?: string }) {
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQuery ?? '')
  const [primary, setPrimary] = useState<Item[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 24, totalResults: 0, nextPageToken: null as string | null })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // React to URL changes (router.push on same page)
    const qParam = searchParams?.get('q') || ''
    setQ(qParam)
  }, [searchParams])

  useEffect(() => {
    if (!q.trim()) { setPrimary([]); setLoading(false); return }
    setLoading(true)
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const url = new URL('/api/search', window.location.origin)
        url.searchParams.set('q', q)
        url.searchParams.set('game', 'mtg')
        url.searchParams.set('lang', 'en')
        url.searchParams.set('limit', '24')
        const res = await fetch(url, { signal: controller.signal })
        const json = await res.json()
        setPrimary(Array.isArray(json?.primary) ? json.primary : [])
        setMeta({ page: Number(json?.page || 1), pageSize: Number(json?.pageSize || 24), totalResults: Number(json?.totalResults || 0), nextPageToken: json?.nextPageToken || null })
      } catch {}
      setLoading(false)
    }, 200)
    return () => { clearTimeout(t); controller.abort() }
  }, [q])

  if (!q.trim()) return null

  return (
    <div className="mt-6">
      {loading && primary.length === 0 ? (
        <div className="text-sm" style={{ color: 'var(--mutedText)' }}>Loading…</div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {primary.map((item) => {
          const href = item.id ? printingHref(item.id) : '#'
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
                <div className="text-sm font-medium truncate">{item.title}</div>
                <div className="text-xs" style={{ color: 'var(--mutedText)' }}>
                  {item.setName || (item.setCode || '').toUpperCase()}
                </div>
              </div>
            </Link>
          )
          })}
      </div>
    </div>
  )
}


