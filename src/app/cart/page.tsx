'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { SWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/CartProvider'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { formatUsd, formatCLP } from '@/lib/format'
import Image from 'next/image'
import Link from 'next/link'
import SkeletonCartRow from '@/components/SkeletonCartRow'
import { usePricing } from '@/components/PricingProvider'
import { calculateShipping, meetsMinimumOrder, amountToMinimum, amountToFreeShipping } from '@/lib/pricing'


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
  const { config } = usePricing()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.lineTotal, 0), [items])
  
  // Calculate shipping and totals
  const shipping = useMemo(() => {
    if (!config) return 0
    return calculateShipping(subtotal, config.shippingFlatClp, config.freeShippingThresholdClp)
  }, [subtotal, config])
  
  const total = useMemo(() => subtotal + shipping, [subtotal, shipping])
  
  const meetsMinimum = useMemo(() => {
    if (!config) return true
    return meetsMinimumOrder(subtotal, config.minOrderSubtotalClp)
  }, [subtotal, config])
  
  const amountToMin = useMemo(() => {
    if (!config) return 0
    return amountToMinimum(subtotal, config.minOrderSubtotalClp)
  }, [subtotal, config])
  
  const amountToFree = useMemo(() => {
    if (!config) return 0
    return amountToFreeShipping(subtotal, config.freeShippingThresholdClp)
  }, [subtotal, config])

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
    if (!meetsMinimum) {
      alert(`Minimum order is ${config?.useCLP ? formatCLP(config.minOrderSubtotalClp) : formatUsd(config?.minOrderSubtotalClp || 0)}. Add ${config?.useCLP ? formatCLP(amountToMin) : formatUsd(amountToMin)} more to checkout.`)
      return
    }
    
    const email = window.prompt('Enter your email to checkout as guest')
    if (!email) return
    const res = await fetch('/api/checkout/guest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })
    const json = await res.json()
    if (res.ok && json?.orderId) {
      window.location.href = `/order/confirmation?orderId=${encodeURIComponent(json.orderId)}`
    }
  }

  async function checkoutUser() {
    if (!meetsMinimum) {
      alert(`Minimum order is ${config?.useCLP ? formatCLP(config.minOrderSubtotalClp) : formatUsd(config?.minOrderSubtotalClp || 0)}. Add ${config?.useCLP ? formatCLP(amountToMin) : formatUsd(amountToMin)} more to checkout.`)
      return
    }
    
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
    <div className="mx-auto max-w-4xl p-2 md:p-6">
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
            <div key={it.printingId} className="border rounded p-3">
              {/* Desktop layout */}
              <div className="hidden md:flex items-center gap-4">
                <div className="w-12 h-16 relative">
                  <Image src={it.imageUrl} alt={it.name} fill sizes="48px" className="object-contain rounded" />
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
                <div className="w-20 text-right tabular-nums">{config?.useCLP ? formatCLP(it.unitPrice) : formatUsd(it.unitPrice)}</div>
                <div className="w-24 text-right tabular-nums font-bold">{config?.useCLP ? formatCLP(it.lineTotal) : formatUsd(it.lineTotal)}</div>
                <div>
                  <button className="btn btn-ghost" onClick={() => update(it.printingId, 'remove')}>Remove</button>
                </div>
              </div>
              
              {/* Mobile layout */}
              <div className="md:hidden">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 relative">
                    <Image src={it.imageUrl} alt={it.name} fill sizes="64px" className="object-cover rounded" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-xs" style={{ color: 'var(--mutedText)' }}>{(it.setName || it.setCode.toUpperCase())}{it.collectorNumber ? ` • #${it.collectorNumber}` : ''}</div>
                  </div>
                </div>
                
                {/* Controls below content on mobile */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button className="btn btn-sm" onClick={() => update(it.printingId, 'inc', -1)} aria-label="Decrease quantity">−</button>
                    <div className="w-8 text-center tabular-nums">{it.quantity}</div>
                    <button className="btn btn-sm" onClick={() => update(it.printingId, 'inc', 1)} aria-label="Increase quantity">+</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm tabular-nums">{config?.useCLP ? formatCLP(it.unitPrice) : formatUsd(it.unitPrice)} each</div>
                    <div className="text-lg font-bold tabular-nums">{config?.useCLP ? formatCLP(it.lineTotal) : formatUsd(it.lineTotal)}</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => update(it.printingId, 'remove')}>Remove</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 ml-auto max-w-sm border rounded p-4">
          {/* Progress banners */}
          {!meetsMinimum && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <div className="font-medium text-yellow-800">Minimum order required</div>
              <div className="text-yellow-700">
                Add {config?.useCLP ? formatCLP(amountToMin) : formatUsd(amountToMin)} to reach the minimum order of {config?.useCLP ? formatCLP(config?.minOrderSubtotalClp || 0) : formatUsd(config?.minOrderSubtotalClp || 0)}.
              </div>
            </div>
          )}
          
          {config?.freeShippingThresholdClp && amountToFree > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="font-medium text-blue-800">Free shipping available</div>
              <div className="text-blue-700">
                Add {config?.useCLP ? formatCLP(amountToFree) : formatUsd(amountToFree)} to get free shipping.
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{config?.useCLP ? formatCLP(subtotal) : formatUsd(subtotal)}</span>
          </div>
          {shipping > 0 && (
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="tabular-nums">{config?.useCLP ? formatCLP(shipping) : formatUsd(shipping)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span>
            <span className="tabular-nums">{config?.useCLP ? formatCLP(total) : formatUsd(total)}</span>
          </div>
          <div className="mt-4">
            {authed ? (
              <button 
                className="btn btn-gradient w-full" 
                onClick={checkoutUser} 
                disabled={redirecting || !meetsMinimum} 
                aria-busy={redirecting}
              >
                {redirecting ? 'Processing…' : meetsMinimum ? 'Checkout' : 'Minimum order required'}
              </button>
            ) : (
              <button 
                className="btn btn-gradient w-full" 
                onClick={checkoutGuest}
                disabled={!meetsMinimum}
              >
                {meetsMinimum ? 'Checkout as guest' : 'Minimum order required'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
    </SWRConfig>
  )
}


