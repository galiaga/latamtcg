"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCart } from './CartProvider'

export default function AddToCartButton({ printingId, size = 'md' }: { printingId: string; size?: 'sm' | 'md' | 'lg' }) {
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
  }, [printingId])

  const className = size === 'sm' ? 'btn btn-sm btn-gradient' : size === 'lg' ? 'btn btn-lg btn-gradient' : 'btn btn-gradient'

  return (
    <button type="button" className={className} disabled={adding} aria-disabled={adding} onClick={add} aria-busy={adding}>
      {adding ? 'Adding…' : ok ? 'Added ✓' : 'Add to cart'}
    </button>
  )
}


