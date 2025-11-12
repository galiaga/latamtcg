'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { SWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/CartProvider'
import { supabaseBrowser } from '@/lib/supabase-browser'
import Image from 'next/image'
import Link from 'next/link'
import { CartPageSkeleton } from '@/components/ui/skeletons'
import { useDelayedFlag } from '@/hooks/useDelayedFlag'
import { usePricing } from '@/components/PricingProvider'
import { calculateShipping, meetsMinimumOrder, amountToMinimum, amountToFreeShipping } from '@/lib/pricing'
import { formatPrice } from '@/lib/pricingClient'
import { useGuestCheckout } from '@/hooks/useGuestCheckout'
import GuestCheckoutModal from '@/components/checkout/GuestCheckoutModal'


type CartItem = {
  printingId: string
  finish?: string // 'normal', 'foil', or 'etched' - for identifying the specific variant
  quantity: number
  unitPrice: number
  lineTotal: number
  name: string
  setCode: string
  setName: string | null
  collectorNumber: string
  imageUrl: string
  finishLabel?: string // 'Normal', 'Foil', or 'Etched' - for display
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
  const showSkeleton = useDelayedFlag(150, loading && !hasLoadedOnce)
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

  async function update(printingId: string, action: 'inc' | 'set' | 'remove', quantity?: number, finish?: string) {
    try {
      // Optimistic local update and badge tick in same tab
      setItems((prev) => {
        const arr = [...prev]
        // Find item by both printingId and finish (if provided)
        const idx = arr.findIndex((it) => {
          if (it.printingId !== printingId) return false
          if (finish !== undefined) return it.finish === finish
          return true // If no finish specified, match first item with this printingId (backward compatibility)
        })
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
          const currentItem = items.find((it) => {
            if (it.printingId !== printingId) return false
            if (finish !== undefined) return it.finish === finish
            return true
          })
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

      const postPromise = fetch('/api/cart/update', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, printingId, quantity, finish }) })
        .then(async (r) => {
          if (!r.ok) {
            const errorData = await r.json().catch(() => ({}))
            if (errorData.error === 'purchase_limit_exceeded') {
              // Show user-friendly error message for purchase limits
              alert(errorData.message || 'Purchase limit exceeded')
              throw new Error('Purchase limit exceeded')
            }
            return {}
          }
          const j = await r.json().catch(() => ({}))
          return { totalCount: Number(j?.totalCount), totalPrice: Number(j?.totalPrice) }
        })
      await addOptimisticThenReconcile(postPromise)
      await refresh()
    } catch {}
  }

  // Guest checkout handler (extracted for reuse)
  const handleGuestEmailCollected = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })
      const json = await res.json()
      
      if (res.ok && json?.paymentUrl) {
        // Redirect to Flow payment page
        window.location.href = json.paymentUrl
        return
      }
      
      // Handle specific error cases
      if (json?.error === 'purchase_limit_exceeded') {
        const violations = json?.violations || []
        if (violations.length > 0) {
          const violation = violations[0] // Show first violation
          const limitInfo = violation.limitInfo
          alert(`Purchase limit exceeded: You can only add ${limitInfo.maxAllowed} copies of this item to your cart. Please sign in for full policy enforcement.`)
        } else {
          alert('Some items exceed purchase limits. Please reduce quantities and try again.')
        }
      } else if (json?.error === 'minimum_order_not_met') {
        alert(`Minimum order is ${formatPrice(json.required || 0, config)}. Add ${formatPrice((json.required || 0) - (json.current || 0), config)} more to checkout.`)
      } else if (json?.error === 'configuration_error') {
        // Show descriptive message for configuration errors
        alert(json?.message || 'Payment system configuration error. Please contact support.')
      } else {
        // Prioritize message over error code for better UX
        alert(json?.message || json?.error || 'Unable to checkout')
      }
    } catch (e: any) {
      alert(e?.message || 'Unable to checkout')
      throw e // Re-throw so modal can handle it
    }
  }, [config])

  // Guest checkout hook
  const { isModalOpen, startGuestCheckout, closeModal, submit } = useGuestCheckout({
    onEmailCollected: handleGuestEmailCollected,
  })

  async function checkoutGuest() {
    if (!meetsMinimum) {
      alert(`Minimum order is ${formatPrice(config?.minOrderSubtotalClp || 0, config)}. Add ${formatPrice(amountToMin, config)} more to checkout.`)
      return
    }
    
    // Use hook to start guest checkout (handles feature flag and fallback)
    await startGuestCheckout()
  }

  async function checkoutUser() {
    if (!meetsMinimum) {
      alert(`Minimum order is ${formatPrice(config?.minOrderSubtotalClp || 0, config)}. Add ${formatPrice(amountToMin, config)} more to checkout.`)
      return
    }
    
    try {
      setRedirecting(true)
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' } })
      const json = await res.json()
      if (res.ok && json?.paymentUrl) {
        // Redirect to Flow payment page
        try { window.dispatchEvent(new CustomEvent('cart:refresh')) } catch {}
        window.location.href = json.paymentUrl
        return
      }
      
      // Handle specific error cases
      if (json?.error === 'purchase_limit_exceeded') {
        const violations = json?.violations || []
        if (violations.length > 0) {
          const violation = violations[0] // Show first violation
          const limitInfo = violation.limitInfo
          alert(`Purchase limit exceeded: You can only buy ${limitInfo.maxAllowed} copies of this item within ${limitInfo.windowDays} days. You already have ${limitInfo.alreadyCommitted} committed.`)
        } else {
          alert('Some items exceed purchase limits. Please reduce quantities and try again.')
        }
      } else if (json?.error === 'minimum_order_not_met') {
        alert(`Minimum order is ${formatPrice(json.required || 0, config)}. Add ${formatPrice((json.required || 0) - (json.current || 0), config)} more to checkout.`)
      } else if (json?.error === 'configuration_error') {
        // Show descriptive message for configuration errors
        alert(json?.message || 'Payment system configuration error. Please contact support.')
      } else {
        // Prioritize message over error code for better UX
        alert(json?.message || json?.error || 'Unable to checkout')
      }
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
      {showSkeleton ? (
        <CartPageSkeleton itemCount={3} />
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
            <div key={`${it.printingId}-${it.finish || 'normal'}`} className="border rounded p-3">
              {/* Desktop layout */}
              <div className="hidden md:flex items-center gap-4">
                <Link href={`/mtg/printing/${it.printingId}`} className="w-12 h-16 relative block hover:opacity-80 transition-opacity">
                  <Image src={it.imageUrl} alt={it.name} fill sizes="48px" className="object-contain rounded" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/mtg/printing/${it.printingId}`} className="font-medium truncate block hover:underline">
                    {it.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-xs" style={{ color: 'var(--mutedText)' }}>{(it.setName || it.setCode.toUpperCase())}{it.collectorNumber ? ` • #${it.collectorNumber}` : ''}</div>
                    {it.finishLabel && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ 
                        background: 'var(--primarySoft)', 
                        color: 'var(--primary)',
                        fontWeight: '500'
                      }}>
                        {it.finishLabel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-sm" onClick={() => update(it.printingId, 'inc', -1, it.finish)} aria-label="Decrease quantity">−</button>
                  <div className="w-8 text-center tabular-nums">{it.quantity}</div>
                  <button 
                    className="btn btn-sm" 
                    onClick={() => update(it.printingId, 'inc', 1, it.finish)} 
                    aria-label="Increase quantity"
                    disabled={it.quantity >= 4}
                  >+</button>
                </div>
                <div className="w-20 text-right tabular-nums">{formatPrice(it.unitPrice, config)}</div>
                <div className="w-24 text-right tabular-nums font-bold">{formatPrice(it.lineTotal, config)}</div>
                <div>
                  <button className="btn btn-ghost" onClick={() => update(it.printingId, 'remove', undefined, it.finish)}>Remove</button>
                </div>
              </div>
              
              {/* Mobile layout */}
              <div className="md:hidden">
                <div className="flex items-start gap-3">
                  <Link href={`/mtg/printing/${it.printingId}`} className="w-16 h-16 relative block hover:opacity-80 transition-opacity">
                    <Image src={it.imageUrl} alt={it.name} fill sizes="64px" className="object-cover rounded" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/mtg/printing/${it.printingId}`} className="font-medium truncate block hover:underline">
                      {it.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-xs" style={{ color: 'var(--mutedText)' }}>{(it.setName || it.setCode.toUpperCase())}{it.collectorNumber ? ` • #${it.collectorNumber}` : ''}</div>
                      {it.finishLabel && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ 
                          background: 'var(--primarySoft)', 
                          color: 'var(--primary)',
                          fontWeight: '500'
                        }}>
                          {it.finishLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Controls below content on mobile */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button className="btn btn-sm" onClick={() => update(it.printingId, 'inc', -1, it.finish)} aria-label="Decrease quantity">−</button>
                    <div className="w-8 text-center tabular-nums">{it.quantity}</div>
                    <button 
                      className="btn btn-sm" 
                      onClick={() => update(it.printingId, 'inc', 1, it.finish)} 
                      aria-label="Increase quantity"
                      disabled={it.quantity >= 4}
                    >+</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm tabular-nums">{formatPrice(it.unitPrice, config)} each</div>
                    <div className="text-lg font-bold tabular-nums">{formatPrice(it.lineTotal, config)}</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => update(it.printingId, 'remove', undefined, it.finish)}>Remove</button>
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
                Add {formatPrice(amountToMin, config)} to reach the minimum order of {formatPrice(config?.minOrderSubtotalClp || 0, config)}.
              </div>
            </div>
          )}
          
          {config?.freeShippingThresholdClp && amountToFree > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="font-medium text-blue-800">Free shipping available</div>
              <div className="text-blue-700">
                Add {formatPrice(amountToFree, config)} to get free shipping.
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPrice(subtotal, config)}</span>
          </div>
          {shipping > 0 && (
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="tabular-nums">{formatPrice(shipping, config)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(total, config)}</span>
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

      {/* Guest Checkout Modal */}
      {isModalOpen && (
        <GuestCheckoutModal
          isOpen={isModalOpen}
          initialEmail={typeof window !== 'undefined' ? localStorage.getItem('latamtcg_guest_email') ?? '' : ''}
          onCancel={closeModal}
          onContinue={submit}
          onCreateAccount={(email) => router.push(`/auth?email=${encodeURIComponent(email)}`)}
        />
      )}
    </div>
    </SWRConfig>
  )
}


