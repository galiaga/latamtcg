"use client"

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type ApiItem = {
  kind: 'printing' | 'group'
  id?: string
  groupId: string
  game: string
  title: string
  subtitle?: string
  finishLabel?: string | null
  variantLabel?: string | null
  imageNormalUrl?: string | null
  setCode?: string
  setName?: string | null
  collectorNumber?: string
}

type Props = {
  placeholder?: string
  defaultGame?: string
  defaultLang?: 'en' | 'all'
  limit?: number
}

export default function SearchBox({ placeholder = 'Search printings…', defaultGame = 'mtg', defaultLang = 'en', limit = 15 }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ApiItem[]>([])
  const [highlight, setHighlight] = useState(0)
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setItems([])
      setOpen(false)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const url = new URL('/api/search', window.location.origin)
        url.searchParams.set('q', query)
        url.searchParams.set('game', defaultGame)
        url.searchParams.set('lang', defaultLang)
        url.searchParams.set('limit', String(limit))
        const res = await fetch(url.toString(), { signal: controller.signal, headers: { 'accept': 'application/json' } })
        if (res.ok) {
          const json = await res.json()
          const arr = Array.isArray(json?.items) ? (json.items as ApiItem[]) : []
          setItems(arr)
          setOpen(arr.length > 0)
          setHighlight(0)
        } else {
          setItems([])
          setOpen(false)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 120)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [query, defaultGame, defaultLang, limit])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[highlight]
      if (item) select(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function select(item: ApiItem) {
    setOpen(false)
    if (item.kind === 'group') {
      router.push(`/mtg/${item.groupId}`)
    } else {
      // Printing-level page not yet implemented; navigate to group for now
      router.push(`/mtg/${item.groupId}`)
    }
  }

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex items-center gap-2">
        <span className="badge">MTG</span>
        <input
          ref={inputRef}
          className="input flex-1"
          placeholder={placeholder}
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (items.length) setOpen(true) }}
        />
      </div>
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-w-xl rounded-md"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
        >
          {items.length === 0 && !loading && (
            <li className="px-3 py-2 text-sm text-zinc-500">No results</li>
          )}
          {items.map((item, idx) => (
            <li
              key={`${item.kind}-${item.id ?? item.groupId}-${idx}`}
              role="option"
              aria-selected={highlight === idx}
              className={`px-3 py-2 flex items-center gap-2 cursor-pointer`}
              style={highlight === idx ? { background: 'var(--surface-2)' } : undefined}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => { e.preventDefault(); select(item) }}
            >
              {item.kind === 'printing' && item.imageNormalUrl ? (
                <Image src={item.imageNormalUrl} alt={item.title} width={36} height={36} className="rounded" />
              ) : (
                <div className="w-9 h-9 rounded" style={{ background: 'var(--surface-2)' }} />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {item.title}
                  {item.kind === 'printing' && item.variantLabel ? <span style={{ color: 'var(--mutedText)' }}> ({item.variantLabel})</span> : null}
                </div>
                {item.kind === 'printing' && item.subtitle ? (
                  <div className="text-xs truncate" style={{ color: 'var(--mutedText)' }}>{item.subtitle}</div>
                ) : item.kind === 'group' ? (
                  <div className="text-xs" style={{ color: 'var(--primary)' }}>See all printings</div>
                ) : null}
                <div className="mt-0.5 flex gap-1">
                  {item.kind === 'printing' && item.finishLabel ? (
                    <span className="inline-block px-1.5 py-0.5 text-[10px] rounded badge" style={{ border: 'none' }}>{item.finishLabel}</span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
          {loading && (
            <li className="px-3 py-2 text-sm text-zinc-500">Loading…</li>
          )}
        </ul>
      )}
    </div>
  )
}


