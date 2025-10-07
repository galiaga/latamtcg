'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { SWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/CartProvider'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { formatUsd } from '@/lib/format'
import Image from 'next/image'
import Link from 'next/link'
import SkeletonCartRow from '@/components/SkeletonCartRow'


type CartItem = {
  printingId: string
  quantity: number
  unitPrice: number
  lineTotal: number
  name: string
  setCode: string
  setName: string | null
  collectorNumber: string
  imageUrl: string
}

export default function CartPage() {
  const router = useRouter()
  const { mutate: mutateCart, addOptimisticThenReconcile } = useCart() as any
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.lineTotal, 0), [items])

  const refresh = useCallback(async () => {
    setLoading(!hasLoadedOnce)
    setError(null)
    try {
      const res = await fetch('/api/cart', { cache: 'no-store' })
      const json = await res.json()
      setItems(Array.isArray(json?.items) ? json.items : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load cart')
    }
    setLoading(false)
    setHasLoadedOnce(true)
    // No global pulses/events on reconcile to avoid loops
  }, [hasLoadedOnce])

  useEffect(() => {
    // Detect auth via client (avoid hitting server route that touches DB)
    (async () => {
      try {
        const supabase = supabaseBrowser()
        const { data } = await supabase.auth.getSession()
        setAuthed(Boolean(data.session))
      } catch {
        setAuthed(false)
      }
    })()
    refresh()
    return () => {}
  }, [refresh])

  async function update(printingId: string, action: 'inc' | 'set' | 'remove', quantity?: number) {
    try {
      // Optimistic local update and badge tick in same tab
      setItems((prev) => {
        const arr = [...prev]
        const idx = arr.findIndex((it) => it.printingId === printingId)
        if (idx >= 0) {
          if (action === 'remove') {
            arr.splice(idx, 1)
          } else if (action === 'inc') {
            const delta = Number.isFinite(Number(quantity)) ? Math.floor(Number(quantity)) : 1
            const nextQty = Math.max(1, arr[idx].quantity + delta)
            arr[idx] = { ...arr[idx], quantity: nextQty, lineTotal: nextQty * arr[idx].unitPrice }
          } else if (action === 'set') {
            const next = Math.max(1, Number(quantity || 1))
            arr[idx] = { ...arr[idx], quantity: next, lineTotal: next * arr[idx].unitPrice }
          }
        }
        return arr
      })

      // Optimistically update provider count for header badge
      try {
        mutateCart((curr: any) => {
          const base = curr || { items: [], subtotal: 0, total: 0, count: 0 }
          const currentItem = items.find((it) => it.printingId === printingId)
          let delta = 0
          if (action === 'remove' && currentItem) delta = -currentItem.quantity
          else if (action === 'inc') delta = Number.isFinite(Number(quantity)) ? Math.floor(Number(quantity as any)) : 1
          else if (action === 'set' && currentItem) {
            const next = Math.max(1, Number(quantity || 1))
            delta = next - currentItem.quantity
          }
          const nextCount = Math.max(0, Number(base.count || 0) + delta)
          return { ...base, count: nextCount }
        }, { revalidate: false })
      } catch {}

      const postPromise = fetch('/api/cart/update', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, printingId, quantity }) })
        .then(async (r) => {
          if (!r.ok) return {}
          const j = await r.json().catch(() => ({}))
          return { totalCount: Number(j?.totalCount), totalPrice: Number(j?.totalPrice) }
        })
      await addOptimisticThenReconcile(postPromise)
      await refresh()
    } catch {}
  }

  async function checkoutGuest() {
    const email = window.prompt('Enter your email to checkout as guest')
    if (!email) return
    const res = await fetch('/api/checkout/guest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })
    const json = await res.json()
    if (res.ok && json?.orderId) {
      window.location.href = `/order/confirmation?orderId=${encodeURIComponent(json.orderId)}`
    }
  }

  async function checkoutUser() {
    try {
      setRedirecting(true)
      const res = await fetch('/api/checkout/user', { method: 'POST', headers: { 'content-type': 'application/json' } })
      const json = await res.json()
      if (res.ok && json?.orderId) {
        const target = `/order/confirmation?orderId=${encodeURIComponent(json.orderId)}`
        try { window.dispatchEvent(new CustomEvent('cart:refresh')) } catch {}
        // Try client navigation first, then hard redirect fallback
        try {
          router.push(target)
          // Fallback if client navigation is blocked
          setTimeout(() => {
            try {
              if (typeof window !== 'undefined' && window.location.pathname !== '/order/confirmation') {
                window.location.href = target
              }
            } catch {}
          }, 300)
        } catch {
          try { window.location.href = target } catch {}
        }
        return
      }
      alert(json?.error || 'Unable to checkout')
    } catch (e: any) {
      alert(e?.message || 'Unable to checkout')
    } finally {
      setRedirecting(false)
    }
  }

  return (
    <SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: false, refreshInterval: 0, dedupingInterval: 4000 }}>
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Your Cart</h1>
      {loading && !hasLoadedOnce ? (
        <div className="mt-4 grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCartRow key={i} />
          ))}
        </div>
      ) : null}
      {error ? <div className="mt-4 text-red-600">{error}</div> : null}
      {!loading && items.length === 0 ? (
        <div className="mt-6">
          <p>Your cart is empty.</p>
          <div className="mt-4"><Link href="/mtg" className="btn">Browse cards</Link></div>
        </div>
      ) : null}
      {items.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4">
          {items.map((it) => (
            <div key={it.printingId} className="flex items-center gap-4 border rounded p-3">
              <div className="w-16 h-16 relative">
                <Image src={it.imageUrl} alt={it.name} fill sizes="64px" className="object-cover rounded" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-xs" style={{ color: 'var(--mutedText)' }}>{(it.setName || it.setCode.toUpperCase())}{it.collectorNumber ? ` • #${it.collectorNumber}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={() => update(it.printingId, 'inc', -1)} aria-label="Decrease quantity">−</button>
                <div className="w-8 text-center tabular-nums">{it.quantity}</div>
                <button className="btn btn-sm" onClick={() => update(it.printingId, 'inc', 1)} aria-label="Increase quantity">+</button>
              </div>
              <div className="w-20 text-right tabular-nums">{formatUsd(it.unitPrice)}</div>
              <div className="w-24 text-right tabular-nums font-medium">{formatUsd(it.lineTotal)}</div>
              <div>
                <button className="btn btn-ghost" onClick={() => update(it.printingId, 'remove')}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 ml-auto max-w-sm border rounded p-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatUsd(subtotal)}</span>
          </div>
          <div className="mt-4">
            {authed ? (
              <button className="btn btn-gradient w-full" onClick={checkoutUser} disabled={redirecting} aria-busy={redirecting}>{redirecting ? 'Processing…' : 'Checkout'}</button>
            ) : (
              <button className="btn btn-gradient w-full" onClick={checkoutGuest}>Checkout as guest</button>
            )}
          </div>
        </div>
      )}
    </div>
    </SWRConfig>
  )
}


