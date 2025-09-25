"use client"

import { useEffect, useId, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { printingHref, cardHref } from '@/lib/routes'
import { findPrintingIdBySetCollector } from '@/lib/printings'
import { fmtCollector } from '@/lib/format'

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
  const boxRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [submitting, setSubmitting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [aborter, setAborter] = useState<AbortController | null>(null)

  function normalizeSubmitQuery(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function handleSearchSubmit(src: 'enter' | 'button' | 'chip', value?: string) {
    const q = normalizeSubmitQuery((value ?? query) || '')
    if (!q) return
    const target = `/mtg/search?q=${encodeURIComponent(q)}`
    if (process.env.NODE_ENV !== 'production') console.debug('[search] submit', { src, q, route: target })
    setOpen(false)
    setIsFocused(false)
    inputRef.current?.blur()
    aborter?.abort()
    setSubmitting(true)
    const before = typeof window !== 'undefined' ? window.location.href : ''
    router.push(target)
    setTimeout(() => {
      const after = typeof window !== 'undefined' ? window.location.href : ''
      if (process.env.NODE_ENV !== 'production') console.debug('[search] after push', { before, after })
      if (before === after && typeof window !== 'undefined') {
        // Fallback hard navigation if client-side navigation was blocked
        window.location.href = target
      }
      setSubmitting(false)
    }, 300)
  }

  useEffect(() => {
    const qTrim = query.trim()
    const shouldFetch = isFocused && open && qTrim.length >= 2 && !submitting
    if (!shouldFetch) {
      setLoading(false)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    setAborter(controller)
    const t = setTimeout(async () => {
      try {
        const url = new URL('/api/search', window.location.origin)
        url.searchParams.set('q', qTrim)
        url.searchParams.set('page', '1')
        url.searchParams.set('limit', '10')
        const res = await fetch(url.toString(), { signal: controller.signal, headers: { 'accept': 'application/json' } })
        if (res.ok) {
          const json = await res.json()
          const primary: any[] = Array.isArray(json?.primary) ? json.primary : []
          const other: any[] = Array.isArray(json?.otherNameMatches) ? json.otherNameMatches : []
          const merged = [...primary, ...other].slice(0, 10)
          const mapped: ApiItem[] = merged.map((i: any) => ({
            kind: 'printing', id: i.id, groupId: i.groupId, game: 'mtg', title: i.title,
            subtitle: i.subtitle, imageNormalUrl: i.imageNormalUrl, setCode: i.setCode, setName: i.setName,
            collectorNumber: i.collectorNumber, finishLabel: i.finishLabel ?? null, variantLabel: i.variantLabel ?? null,
          }))
          setItems(mapped)
          setOpen(isFocused && mapped.length > 0)
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
    }, 200)
    return () => { clearTimeout(t); controller.abort() }
  }, [query, open, isFocused, submitting])

  // Close dropdown on route change (pathname or search params change)
  useEffect(() => {
    setOpen(false)
    setIsFocused(false)
    aborter?.abort()
  }, [pathname, searchParams])

  // Close on outside click or scroll
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      // If a suggestion is highlighted, consume Enter and submit that title.
      if (open && items.length > 0 && items[highlight]) {
        e.preventDefault()
        handleSearchSubmit('enter', items[highlight].title)
        return
      }
      // Otherwise, allow the form's onSubmit to handle (no preventDefault here)
    }
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    }
  }

  async function select(item: ApiItem) {
    setOpen(false)
    if (item.kind === 'group') {
      router.push(cardHref(encodeURIComponent(item.title.replace(/\s+/g, '-').toLowerCase())))
    } else {
      let id = item.id
      if (!id) {
        if (process.env.NODE_ENV !== 'production') console.warn('[search] missing printingId for', item)
        if (process.env.NODE_ENV !== 'production' && item.setCode && item.collectorNumber) {
          const resolved = await findPrintingIdBySetCollector(item.setCode, item.collectorNumber)
          if (resolved) {
            if (process.env.NODE_ENV !== 'production') console.debug('[search] resolved id via fallback', resolved)
            id = resolved
          }
        }
        if (!id) return
      }
      const href = printingHref(id)
      if (process.env.NODE_ENV !== 'production') console.debug('navigate →', href)
      router.push(href)
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (process.env.NODE_ENV !== 'production') console.debug('[search] onSubmit'); handleSearchSubmit('button') }}>
        <span className="badge" style={{ background: 'var(--primarySoft)', borderColor: 'transparent', color: 'var(--primary)' }}>MTG</span>
        <input
          ref={inputRef}
          className="input flex-1 transition-soft"
          placeholder={placeholder}
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => { if (process.env.NODE_ENV !== 'production') console.debug('[search] input', e.target.value); setQuery(e.target.value); setOpen(true) }}
          onKeyDown={onKeyDown}
          onFocus={() => { setIsFocused(true); if (query.trim().length >= 2 && items.length) setOpen(true) }}
          onBlur={() => { setIsFocused(false) }}
        />
        <button type="submit" className="btn btn-gradient transition-soft" aria-label="Search" disabled={!query.trim() || submitting}>
          {submitting ? 'Searching…' : 'Search'}
        </button>
      </form>
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-md card-2xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <li className="px-3 py-1 text-[11px]" style={{ color: 'var(--mutedText)', borderBottom: '1px solid var(--divider)' }}>
            in Magic: The Gathering
          </li>
          {items.length === 0 && !loading && (
            <li className="px-3 py-2 text-sm text-zinc-500">No results</li>
          )}
          {items.map((item, idx) => (
            <li
              key={`${item.kind}-${item.id ?? item.groupId}-${idx}`}
              role="option"
              aria-selected={highlight === idx}
              className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-soft`}
              style={highlight === idx ? { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 2px var(--primarySoft)' } : undefined}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => { e.preventDefault(); select(item) }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {(() => {
                    const parts: string[] = []
                    if (item.variantLabel) parts.push(item.variantLabel)
                    if (item.finishLabel && item.finishLabel !== 'Standard') parts.push(item.finishLabel)
                    return parts.length ? `${item.title} (${parts.join(', ')})` : item.title
                  })()}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--mutedText)' }}>
                  {(() => {
                    const c = fmtCollector(item.collectorNumber as any)
                    const left = item.setName || item.setCode || ''
                    return [left, c ? `#${c}` : null].filter(Boolean).join(' · ')
                  })()}
                </div>
              </div>
              {item.setCode ? (
                <span className="badge" style={{ background: 'var(--primarySoft)', borderColor: 'transparent', color: 'var(--primary)' }}>{(item.setCode || '').toUpperCase()}</span>
              ) : null}
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


