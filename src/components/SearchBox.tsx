"use client"

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { printingHref, cardHref } from '@/lib/routes'
import { fmtCollector } from '@/lib/format'
import Spinner from './Spinner'

type ApiItem = {
  kind: 'printing' | 'group'
  id?: string
  groupId: string
  game: string
  title: string
  subtitle?: string
  finishLabel?: string | null
  variantLabel?: string | null
  variantSuffix?: string | null
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

export default function SearchBox({ placeholder = 'Search printings…' }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ApiItem[]>([])
  const [highlight, setHighlight] = useState(0)
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLUListElement | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [submitting, setSubmitting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isUserTyping, setIsUserTyping] = useState(false)
  const [aborter, setAborter] = useState<AbortController | null>(null)
  const [panelStyle, setPanelStyle] = useState<{ left: number; top: number; width: number; maxHeight: number }>({ left: 0, top: 0, width: 0, maxHeight: 280 })
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const openRef = useRef(false)

  function normalizeSubmitQuery(text: string): string {
    // Preserve user casing as typed, but normalize internal spacing/diacritics
    const cleaned = text
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
    return cleaned
  }

  function handleSearchSubmit(src: 'enter' | 'button' | 'chip', value?: string) {
    const q = normalizeSubmitQuery((value ?? query) || '')
    if (!q) return
    const target = `/mtg/search?q=${encodeURIComponent(q)}`
    if (process.env.NODE_ENV === 'development') console.debug('[search] submit', { src, q, route: target })
    setOpen(false)
    setIsFocused(false)
    inputRef.current?.blur()
    aborter?.abort()
    setSubmitting(true)
    const before = typeof window !== 'undefined' ? window.location.href : ''
    router.push(target)
    setTimeout(() => {
      const after = typeof window !== 'undefined' ? window.location.href : ''
      if (process.env.NODE_ENV === 'development') console.debug('[search] after push', { before, after })
      if (before === after && typeof window !== 'undefined') {
        // Fallback hard navigation if client-side navigation was blocked
        window.location.href = target
      }
      setSubmitting(false)
    }, 300)
  }

  // Separate effect for URL sync - only runs when searchParams change
  useEffect(() => {
    const qp = searchParams?.get('q')
    if (typeof qp === 'string') {
      const shown = qp.replace(/\+/g, ' ')
      setQuery(shown)
      // Use a small delay to ensure this runs after any auto-focus
      setTimeout(() => {
        setIsUserTyping(false) // Mark as not user typing when syncing from URL
      }, 0)
    }
  }, [searchParams])

  // Separate effect for search suggestions - only runs when query changes
  useEffect(() => {
    const qTrim = query.trim()
    const shouldFetch = qTrim.length >= 2 && !submitting && isUserTyping
    if (!shouldFetch) {
      if (qTrim.length < 2 || !isUserTyping) {
        setLoading(false)
        setItems([])
        setOpen(false)
        openRef.current = false
      }
      return
    }
    setLoading(true)
    
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        const url = new URL('/api/search/suggestions', window.location.origin)
        url.searchParams.set('q', qTrim)
        url.searchParams.set('limit', '10')
        const cacheKey = JSON.stringify({ q: qTrim, limit: 10, type: 'suggestions' })
        const res = await fetch(url.toString(), { headers: { 'accept': 'application/json', 'x-cache-key': cacheKey } })
        if (res.ok) {
          const json = await res.json()
          const suggestions: any[] = Array.isArray(json) ? json : []
          const mapped: ApiItem[] = suggestions.map((i: any) => ({
            kind: i.kind || 'printing', id: i.id, groupId: i.groupId, game: i.game || 'mtg', title: i.title,
            subtitle: i.subtitle, imageNormalUrl: i.imageNormalUrl, setCode: i.setCode, setName: i.setName,
            collectorNumber: i.collectorNumber, finishLabel: i.finishLabel ?? null, variantLabel: i.variantLabel ?? null,
            variantSuffix: i.variantSuffix ?? null,
          }))
          setItems(mapped)
          setOpen(mapped.length > 0)
          openRef.current = mapped.length > 0
          setHighlight(0)
        } else {
          setItems([])
          setOpen(false)
          openRef.current = false
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }, 300)
    
    return () => { 
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
        fetchTimeoutRef.current = null
      }
    }
  }, [query, submitting, pathname, isUserTyping])

  // Close dropdown on route change (pathname change only)
  useEffect(() => {
    setOpen(false)
    openRef.current = false
    setIsFocused(false)
    setLoading(false)
    setItems([])
    aborter?.abort()
  }, [pathname, aborter])

  // Close on outside click or scroll
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return
      const target = e.target as Node
      const inBox = boxRef.current.contains(target)
      const inPanel = panelRef.current ? panelRef.current.contains(target) : false
      if (!inBox && !inPanel) setOpen(false)
    }
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Reposition portal panel to sit under input and avoid filter bar
  useEffect(() => {
    if (!open) return
    function reposition() {
      if (!inputRef.current) return
      const r = inputRef.current.getBoundingClientRect()
      const inputBottom = r.bottom
      const left = r.left
      const width = r.width
      const viewportSpace = window.innerHeight - inputBottom - 8
      const filterEl = document.getElementById('search-filter-bar')
      let filterSpace = Number.POSITIVE_INFINITY
      let minHeight = 280
      if (filterEl) {
        const fr = filterEl.getBoundingClientRect()
        const filterTop = fr.top
        filterSpace = Math.max(0, filterTop - inputBottom - 8)
        // Increase minimum height when filter bar is present
        minHeight = 240
      }
      const maxHeight = Math.max(minHeight, Math.min(320, viewportSpace, filterSpace, window.innerHeight * 0.5))
      setPanelStyle({ left, top: inputBottom + 4, width, maxHeight })
    }
    const onResize = () => { window.requestAnimationFrame(reposition) }
    const onScroll = () => { window.requestAnimationFrame(reposition) }
    reposition()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onScroll) }
  }, [open, items.length])

  // Global ESC close to handle focus in panel
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      // If a suggestion is highlighted AND the user has navigated through suggestions, submit that title.
      if (open && items.length > 0 && items[highlight] && highlight > 0) {
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
        if (process.env.NODE_ENV === 'development') console.warn('[search] missing printingId for', item)
        if (process.env.NODE_ENV === 'development' && item.setCode && item.collectorNumber) {
          try {
            const url = new URL('/api/printing/resolve', window.location.origin)
            url.searchParams.set('set', String(item.setCode))
            url.searchParams.set('cn', String(item.collectorNumber))
            const res = await fetch(url.toString(), { cache: 'no-store' })
            if (res.ok) {
              const json = await res.json()
              if (json?.id) {
                if (process.env.NODE_ENV === 'development') console.debug('[search] resolved id via API fallback', json.id)
                id = String(json.id)
              }
            }
          } catch {}
        }
        if (!id) return
      }
      const href = printingHref(id)
      if (process.env.NODE_ENV === 'development') console.debug('navigate →', href)
      router.push(href)
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (process.env.NODE_ENV === 'development') console.debug('[search] onSubmit'); handleSearchSubmit('button') }}>
        <span className="badge" style={{ background: 'var(--primarySoft)', borderColor: 'transparent', color: 'var(--primary)' }}>MTG</span>
          <input
            ref={inputRef}
            className="input flex-1 transition-soft"
            placeholder={placeholder}
            role="combobox"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-autocomplete="list"
            tabIndex={-1}
            value={query}
          onChange={(e) => { 
            if (process.env.NODE_ENV === 'development') console.debug('[search] input', e.target.value); 
            setQuery(e.target.value); 
            setIsUserTyping(true); // Mark as user typing
            setOpen(true); 
            openRef.current = true 
          }}
          onKeyDown={onKeyDown}
          onFocus={() => { 
            setIsFocused(true); 
            if (query.trim().length >= 2 && isUserTyping) { 
              setOpen(true); 
              openRef.current = true 
            } 
          }}
          onBlur={() => { 
            setTimeout(() => {
              // Only set isFocused to false if the dropdown is not open
              if (!openRef.current) {
                setIsFocused(false)
              }
            }, 100) 
          }}
        />
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 transition-colors" aria-label="Search" disabled={!query.trim() || submitting} style={{ opacity: submitting ? 0.95 : undefined }}>
          {submitting ? <Spinner size="sm" /> : 'Search'}
        </button>
      </form>
      {open && typeof document !== 'undefined' && createPortal(
        (
          <ul
            ref={panelRef}
            id={listboxId}
            role="listbox"
            className="rounded-md card-2xl"
            style={{
              position: 'fixed',
              zIndex: 1000,
              left: panelStyle.left,
              top: panelStyle.top,
              width: panelStyle.width,
              maxHeight: panelStyle.maxHeight,
              overflowY: 'auto',
              background: 'var(--card, #fff)',
              border: '1px solid var(--border, #ddd)'
            }}
          >
            <li className="px-3 py-1" style={{ fontSize: '11px', color: 'var(--mutedText, #666)', borderBottom: '1px solid var(--divider, #ddd)' }}>
              in Magic: The Gathering
            </li>
            {items.length === 0 && !loading && (
              <li className="px-3 py-2 text-zinc-500" style={{ fontSize: '14px' }}>No results</li>
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
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.imageNormalUrl && <img src={item.imageNormalUrl} alt={item.title} className="w-6 h-6 object-cover rounded flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.2' }}>
                      {item.variantSuffix ? `${item.title}${item.variantSuffix}` : item.title}
                    </div>
                    <div className="truncate" style={{ fontSize: '11px', color: 'var(--mutedText, #666)', lineHeight: '1.2' }}>
                      {(() => {
                        const c = fmtCollector(item.collectorNumber as any)
                        const setName = item.setName || ''
                        return [setName, c ? `#${c}` : null].filter(Boolean).join(' · ')
                      })()}
                    </div>
                  </div>
                </div>
                {item.setCode && (
                  <div className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0" style={{ 
                    fontSize: '10px', 
                    background: 'var(--primarySoft, #e0e7ff)', 
                    color: 'var(--primary, #3b82f6)' 
                  }}>
                    {item.setCode.toUpperCase()}
                  </div>
                )}
              </li>
            ))}
            {loading && (
              <li className="px-3 py-2 flex items-center gap-2" style={{ color: 'var(--mutedText)', fontSize: '14px' }}>
                <Spinner size="sm" />
                <span>Searching...</span>
              </li>
            )}
          </ul>
        ),
        document.body
      )}
    </div>
  )
}


