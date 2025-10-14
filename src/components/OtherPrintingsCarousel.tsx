"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getScryfallNormalUrl, getScryfallSmallUrl } from '@/lib/images'
import { formatUsd } from '@/lib/format'

type PrintingItem = {
  id: string
  name: string
  setCode?: string | null
  setName?: string | null
  collectorNumber?: string | number | null
  variant_group?: string | null
  finish_group?: string | null
  priceUsd?: number | string | null
}

export default function OtherPrintingsCarousel({
  ariaLabel = 'Other printings',
  items,
  currentId,
  oracleId,
}: {
  ariaLabel?: string
  items: PrintingItem[]
  currentId?: string
  oracleId: string
}) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const filtered = (items || []).filter((s) => s && s.id && s.id !== currentId)
  const limited = filtered.slice(0, 16)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [dragging, setDragging] = useState(false)
  const pointerState = useRef<{ id: number | null; startX: number; startScroll: number; moved: boolean }>({ id: null, startX: 0, startScroll: 0, moved: false })

  function scrollByItems(dir: 1 | -1) {
    const el = listRef.current
    if (!el) return
    const base = 320
    const step = Math.max(base * 1.2, Math.floor(el.clientWidth * 0.8))
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    // IntersectionObserver for first/last items
    const opts: IntersectionObserverInit = { root: el, rootMargin: '0px', threshold: 1.0 }
    const updateFromEntries = (entries: IntersectionObserverEntry[]) => {
      let firstFully = undefined as undefined | boolean
      let lastFully = undefined as undefined | boolean
      const links = Array.from(el.querySelectorAll('a[role="option"]'))
      const first = links[0] || null
      const last = links[links.length - 1] || null
      for (const entry of entries) {
        if (first && entry.target === first) firstFully = entry.isIntersecting && entry.intersectionRatio >= 0.999
        if (last && entry.target === last) lastFully = entry.isIntersecting && entry.intersectionRatio >= 0.999
      }
      // If we didn't get both in this batch, query current state via getBoundingClientRect as fallback
      if (firstFully === undefined || lastFully === undefined) {
        // no-op; observer will deliver soon
      }
      if (firstFully !== undefined) setCanLeft(!firstFully)
      if (lastFully !== undefined) setCanRight(!lastFully)
    }
    const io = new IntersectionObserver(updateFromEntries, opts)
    const observeEnds = () => {
      io.disconnect()
      const links = Array.from(el.querySelectorAll('a[role="option"]'))
      const first = links[0]
      const last = links[links.length - 1]
      if (first) io.observe(first)
      if (last && last !== first) io.observe(last)
    }
    observeEnds()

    // ResizeObserver to re-evaluate when container size changes
    let ro: ResizeObserver | null = null
    try {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          observeEnds()
        })
        ro.observe(el)
      }
    } catch {}

    // Also re-observe when content changes (length)
    const t = setTimeout(observeEnds, 0)
    return () => {
      clearTimeout(t)
      try { io.disconnect() } catch {}
      try { ro?.disconnect() } catch {}
    }
  }, [limited.length])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    function onPointerDown(e: PointerEvent) {
      // Only primary button drags
      if (e.button !== 0) return
      pointerState.current.id = e.pointerId
      pointerState.current.startX = e.clientX
      try { pointerState.current.startScroll = el?.scrollLeft ?? 0 } catch { pointerState.current.startScroll = 0 }
      pointerState.current.moved = false
      setDragging(false)
      try { el?.setPointerCapture?.(e.pointerId) } catch {}
    }
    function onPointerMove(e: PointerEvent) {
      if (pointerState.current.id !== e.pointerId) return
      const dx = e.clientX - pointerState.current.startX
      if (Math.abs(dx) > 6) {
        pointerState.current.moved = true
        setDragging(true)
        e.preventDefault()
        try { if (el) el.scrollLeft = pointerState.current.startScroll - dx } catch {}
      }
    }
    function endDrag(e: PointerEvent) {
      if (pointerState.current.id !== e.pointerId) return
      try { el?.releasePointerCapture?.(e.pointerId) } catch {}
      pointerState.current.id = null
      // Delay clearing dragging to allow click-capture to read state
      setTimeout(() => setDragging(false), 0)
    }
    function onClickCapture(ev: MouseEvent) {
      if (dragging || pointerState.current.moved) {
        ev.preventDefault()
        ev.stopPropagation()
      }
    }
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('pointerleave', endDrag)
    el.addEventListener('click', onClickCapture, true)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('pointerleave', endDrag)
      el.removeEventListener('click', onClickCapture, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dragging is used in event handlers but effect should only run once to set up listeners
  }, [])

  return (
    <section aria-label={ariaLabel} className="relative mt-6">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>See other printings</h3>
      </header>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--bg)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--bg)] to-transparent" />

        <div
          id="printings-scroll"
          ref={listRef}
          role="listbox"
          tabIndex={0}
          aria-label={ariaLabel}
          data-dragging={dragging ? 'true' : 'false'}
          className="flex gap-3 overflow-x-auto scroll-px-3 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: 'pan-x', cursor: dragging ? 'grabbing' : 'grab' }}
          onKeyDown={(e) => {
            const el = listRef.current
            if (!el) return
            const itemWidth = 320
            if (e.key === 'ArrowRight') { e.preventDefault(); el.scrollBy({ left: itemWidth, behavior: 'smooth' }) }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); el.scrollBy({ left: -itemWidth, behavior: 'smooth' }) }
            else if (e.key === 'Home') { e.preventDefault(); el.scrollTo({ left: 0, behavior: 'smooth' }) }
            else if (e.key === 'End') { e.preventDefault(); el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' }) }
          }}
        >
          {limited.map((s) => {
            const setName = s.setName ?? (s.setCode || '')?.toString().toUpperCase()
            const num = s.collectorNumber ? ` #${s.collectorNumber}` : ''
            const alt = `${s.name} — ${setName}${num}`
            const parts: string[] = []
            if (s.variant_group) parts.push(s.variant_group)
            if (s.finish_group && s.finish_group !== 'Standard') parts.push(s.finish_group)
            const subtitle = `${setName}${num ? ' ·' + num : ''}`
            return (
              <Link
                key={`${s.id}-${s.variant_group}-${s.finish_group}`}
                href={`/mtg/printing/${s.id}`}
                role="option"
                className="snap-start flex min-w-[300px] items-center gap-3 rounded-2xl border px-3 pt-2 transition focus:outline-none focus:ring-2 focus:ring-ring hover:bg-[color-mix(in_lab,var(--chip-hover)_12%,var(--card))]"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
              >
                <img
                  alt={alt}
                  width={48}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  src={getScryfallSmallUrl(String(s.id))}
                  srcSet={`${getScryfallSmallUrl(String(s.id))} 1x, ${getScryfallNormalUrl(String(s.id))} 2x`}
                  className="h-16 w-12 rounded-md border object-contain"
                  style={{ borderColor: 'var(--border)', background: 'color-mix(in oklab, var(--bg) 60%, #fff)' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium" style={{ color: 'var(--text)' }}>{s.name}{parts.length ? ` (${parts.join(', ')})` : ''}</div>
                  
                  {/* Set info - compact styling directly under title */}
                  <div className="text-xs leading-tight mb-1" style={{ color: 'var(--mutedText)' }}>
                    {subtitle}
                  </div>
                  
                  {/* Price section - compact */}
                  <div className="mt-1">
                    {/* Price - bolder and darker */}
                    <div className="text-lg font-semibold text-[var(--fg-strong)] tracking-tight">
                      {formatUsd(s.priceUsd)}
                    </div>
                  </div>
                  
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.finish_group ? (<span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: 'var(--chip-active)', color: '#3A3350' }}>{s.finish_group}</span>) : null}
                  </div>
                </div>
              </Link>
            )
          })}

          {filtered.length > 16 ? (
            <Link href={`/mtg/${oracleId}`} role="option" className="snap-start flex min-w-[300px] items-center justify-center gap-3 rounded-2xl border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)', color: 'var(--text)' }}>
              View all printings
            </Link>
          ) : null}
        </div>

        <button
          aria-label="Previous printings"
          aria-controls="printings-scroll"
          aria-hidden={!canLeft}
          disabled={!canLeft}
          className={`absolute left-1 top-1/2 -translate-y-1/2 rounded-full border backdrop-blur px-2 py-1 transition duration-150 ${canLeft ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
          style={{ background: 'color-mix(in oklab, var(--card) 80%, transparent)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
          onClick={() => scrollByItems(-1)}
        >
          ‹
        </button>
        <button
          aria-label="Next printings"
          aria-controls="printings-scroll"
          aria-hidden={!canRight}
          disabled={!canRight}
          className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-full border backdrop-blur px-2 py-1 transition duration-150 ${canRight ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
          style={{ background: 'color-mix(in oklab, var(--card) 80%, transparent)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
          onClick={() => scrollByItems(1)}
        >
          ›
        </button>
      </div>
    </section>
  )
}


