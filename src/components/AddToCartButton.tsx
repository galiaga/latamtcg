"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCart } from './CartProvider'
import Spinner from './Spinner'

export default function AddToCartButton({ printingId, size = 'md', title }: { printingId: string; size?: 'sm' | 'md' | 'lg' | 'xs'; title?: string }) {
  const [adding, setAdding] = useState(false)
  const [ok, setOk] = useState(false)
  const { mutate, addOptimisticThenReconcile } = useCart()
  const debounceRef = useRef<any>(null)
  const inFlightRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!ok) return
    const t = setTimeout(() => setOk(false), 1200)
    return () => clearTimeout(t)
  }, [ok])

  const add = useCallback(async () => {
    if (!printingId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {}, 250)
    const key = `${printingId}:normal:normal`
    if (inFlightRef.current.has(key)) return
    inFlightRef.current.add(key)
    setAdding(true)
    try {
      // Optimistic update
      try {
        mutate((curr) => {
          const base = curr || { items: [], subtotal: 0, total: 0, count: 0 }
          const next = { ...base, count: Number(base.count || 0) + 1, subtotal: Number(base.subtotal || 0), total: Number(base.total || 0) }
          return next
        }, { revalidate: false })
      } catch {}
      // Do not emit storage pulses; same-tab only
      try { window.dispatchEvent(new CustomEvent('cart:update', { detail: { delta: 1 } })) } catch {}
      const requestId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const postPromise = fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ printingId, quantity: 1, requestId }),
      }).then(async (r) => {
        if (!r.ok) return {}
        setOk(true)
        const json = await r.json().catch(() => ({})) as any
        return { totalCount: Number(json?.totalCount), totalPrice: Number(json?.totalPrice) }
      })
      await addOptimisticThenReconcile(postPromise)
    } finally {
      setAdding(false)
      inFlightRef.current.delete(key)
    }
  }, [printingId, addOptimisticThenReconcile, mutate])

  // Use new styling for card tiles, fallback to old styling for other contexts
  const isCardTile = size === 'md' && title
  const className = isCardTile 
    ? 'px-3 py-1.5 text-sm font-semibold bg-[#9b6bff] text-white transition-colors duration-150 hover:bg-[#8c5cff] active:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-lg'
    : size === 'xs' ? 'inline-flex items-center justify-center text-xs leading-none px-2 py-1 h-5 btn-gradient hover:-translate-y-[1px] hover:shadow-md transition-all duration-200' : 
      size === 'sm' ? 'btn btn-sm btn-gradient hover:-translate-y-[1px] hover:shadow-md transition-all duration-200' : 
      size === 'lg' ? 'btn btn-lg btn-gradient hover:-translate-y-[1px] hover:shadow-md transition-all duration-200' : 
      'btn btn-gradient hover:-translate-y-[1px] hover:shadow-md transition-all duration-200'

  const ariaLabel = title ? `Add to cart: ${title}` : 'Add to cart'

  return (
    <button 
      type="button" 
      className={className} 
      disabled={adding} 
      aria-disabled={adding} 
      onClick={add} 
      aria-busy={adding}
      aria-label={ariaLabel}
    >
      {adding ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Adding…
        </span>
      ) : ok ? 'Added ✓' : 'Add to cart'}
    </button>
  )
}


