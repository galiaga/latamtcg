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
import { useTranslations } from 'next-intl'
import DeliveryMethodSelector, { type DeliveryFormData } from '@/components/checkout/DeliveryMethodSelector'
import { calculateChilexpressShipping } from '@/lib/shipping/chilexpress'


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
  const t = useTranslations()
  const router = useRouter()
  const { mutate: mutateCart, addOptimisticThenReconcile } = useCart() as any
  const { config } = usePricing()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [deliveryData, setDeliveryData] = useState<DeliveryFormData>({
    deliveryMethod: 'courier',
  })
  const showSkeleton = useDelayedFlag(150, loading && !hasLoadedOnce)
  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.lineTotal, 0), [items])
  
  // Calculate shipping cost based on delivery method
  const shipping = useMemo(() => {
    if (deliveryData.deliveryMethod === 'pickup') {
      return 0
    }
    if (deliveryData.deliveryMethod === 'courier' && deliveryData.shippingRegion) {
      const quote = calculateChilexpressShipping({ region: deliveryData.shippingRegion })
      return quote.cost
    }
    // Default: return 0 if no region selected yet (will be calculated on checkout)
    return 0
  }, [deliveryData])
  
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
      setError(e?.message || t('errors.failedToLoadCart'))
    }
    setLoading(false)
    setHasLoadedOnce(true)
    // No global pulses/events on reconcile to avoid loops
  }, [hasLoadedOnce, t])

  useEffect(() => {
    // Detect auth via client (avoid hitting server route that touches DB)
    const supabase = supabaseBrowser()
    let mounted = true
    
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted) return
        
        if (error) {
          console.log('[Cart] Auth check error:', error)
          setAuthed(false)
        } else {
          // Check both session and user to be more robust
          const isAuthenticated = Boolean(data?.session && data.session.user)
          console.log('[Cart] Auth state determined:', isAuthenticated, 'Session exists:', !!data?.session, 'User exists:', !!data?.session?.user)
          setAuthed(isAuthenticated)
        }
      } catch (err) {
        console.error('[Cart] Auth check exception:', err)
        if (mounted) {
          setAuthed(false)
        }
      }
    }
    
    // Initial check
    checkAuth()
    refresh()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      // Check both session and user to be more robust
      const isAuthenticated = Boolean(session && session.user)
      console.log('[Cart] Auth state changed:', event, 'Authenticated:', isAuthenticated)
      setAuthed(isAuthenticated)
    })
    
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
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
              alert(errorData.message || t('errors.purchaseLimitExceeded', { maxAllowed: 1 }))
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
    // Validate delivery data before proceeding
    if (!deliveryData.firstName || !deliveryData.firstName.trim()) {
      alert(t('checkout.delivery.validation.firstNameRequired'))
      return
    }
    if (!deliveryData.lastName || !deliveryData.lastName.trim()) {
      alert(t('checkout.delivery.validation.lastNameRequired'))
      return
    }
    if (deliveryData.deliveryMethod === 'pickup') {
      if (!deliveryData.contactPhone) {
        alert(t('checkout.delivery.contact.phoneRequired'))
        return
      }
      // Validate Chilean phone format
      if (deliveryData.contactPhone.startsWith('+56')) {
        const digitsAfterCode = deliveryData.contactPhone.replace('+56', '')
        if (digitsAfterCode.length !== 9 || !/^\d{9}$/.test(digitsAfterCode)) {
          alert(t('checkout.delivery.contact.phoneInvalidChile'))
          return
        }
      }
    }
    if (deliveryData.deliveryMethod === 'courier') {
      if (!deliveryData.shippingRegion) {
        alert(t('checkout.delivery.validation.regionRequired'))
        return
      }
      if (!deliveryData.shippingCommune) {
        alert(t('checkout.delivery.validation.communeRequired'))
        return
      }
      if (!deliveryData.shippingAddressLine1) {
        alert(t('checkout.delivery.validation.addressRequired'))
        return
      }
    }
    
    // Validate email (required for all guest checkouts)
    if (!email || email.trim() === '') {
      alert(t('checkout.enterValidEmail'))
      return
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email.trim())) {
      alert(t('checkout.enterValidEmail'))
      return
    }
    
    try {
      const res = await fetch('/api/checkout', { 
        method: 'POST', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify({ email: email.trim(), ...deliveryData }) 
      })
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
          alert(t('errors.purchaseLimitExceeded', { maxAllowed: limitInfo.maxAllowed }))
        } else {
          alert(t('errors.someItemsExceedLimits'))
        }
      } else if (json?.error === 'minimum_order_not_met') {
        alert(t('errors.minimumOrderNotMet', { 
          required: formatPrice(json.required || 0, config), 
          amount: formatPrice((json.required || 0) - (json.current || 0), config) 
        }))
      } else if (json?.error === 'configuration_error') {
        // Show descriptive message for configuration errors
        alert(json?.message || t('errors.configurationError'))
      } else {
        // Prioritize message over error code for better UX
        alert(json?.message || json?.error || t('errors.unableToCheckout'))
      }
    } catch (e: any) {
      alert(e?.message || t('errors.unableToCheckout'))
      throw e // Re-throw so modal can handle it
    }
  }, [config, t])

  // Guest checkout hook
  const { isModalOpen, startGuestCheckout, closeModal, submit } = useGuestCheckout({
    onEmailCollected: handleGuestEmailCollected,
  })

  async function checkoutGuest() {
    if (!meetsMinimum) {
      alert(t('errors.minimumOrderNotMet', { 
        required: formatPrice(config?.minOrderSubtotalClp || 0, config), 
        amount: formatPrice(amountToMin, config) 
      }))
      return
    }
    
    // Validate delivery data first
    if (!deliveryData.firstName || !deliveryData.firstName.trim()) {
      alert(t('checkout.delivery.validation.firstNameRequired'))
      return
    }
    if (!deliveryData.lastName || !deliveryData.lastName.trim()) {
      alert(t('checkout.delivery.validation.lastNameRequired'))
      return
    }
    
    // For pickup orders, check if email is already in deliveryData
    if (deliveryData.deliveryMethod === 'pickup') {
      if (!deliveryData.contactPhone) {
        alert(t('checkout.delivery.contact.phoneRequired'))
        return
      }
      // Validate Chilean phone format
      if (deliveryData.contactPhone.startsWith('+56')) {
        const digitsAfterCode = deliveryData.contactPhone.replace('+56', '')
        if (digitsAfterCode.length !== 9 || !/^\d{9}$/.test(digitsAfterCode)) {
          alert(t('checkout.delivery.contact.phoneInvalidChile'))
          return
        }
      }
      
      // Check if email is provided in the form
      if (deliveryData.email && deliveryData.email.trim()) {
        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(deliveryData.email.trim())) {
          alert(t('checkout.enterValidEmail'))
          return
        }
        // Email is in the form, proceed directly
        await handleGuestEmailCollected(deliveryData.email.trim())
        return
      } else {
        // Email not provided, show error
        alert(t('checkout.enterValidEmail'))
        return
      }
    }
    
    // For courier orders, check if email is provided in the form
    if (deliveryData.deliveryMethod === 'courier') {
      if (!deliveryData.shippingRegion) {
        alert(t('checkout.delivery.validation.regionRequired'))
        return
      }
      if (!deliveryData.shippingCommune) {
        alert(t('checkout.delivery.validation.communeRequired'))
        return
      }
      if (!deliveryData.shippingAddressLine1) {
        alert(t('checkout.delivery.validation.addressRequired'))
        return
      }
      
      // Check if email is provided in the form
      if (deliveryData.email && deliveryData.email.trim()) {
        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(deliveryData.email.trim())) {
          alert(t('checkout.enterValidEmail'))
          return
        }
        // Email is in the form, proceed directly
        await handleGuestEmailCollected(deliveryData.email.trim())
        return
      } else {
        // Email not provided, show error
        alert(t('checkout.enterValidEmail'))
        return
      }
    }
    
    // Fallback: use modal/prompt if email not in form (shouldn't happen with new flow)
    await startGuestCheckout()
  }

  async function checkoutUser() {
    if (!meetsMinimum) {
      alert(t('errors.minimumOrderNotMet', { 
        required: formatPrice(config?.minOrderSubtotalClp || 0, config), 
        amount: formatPrice(amountToMin, config) 
      }))
      return
    }
    
    // Validate delivery data
    if (!deliveryData.firstName || !deliveryData.firstName.trim()) {
      alert(t('checkout.delivery.validation.firstNameRequired'))
      return
    }
    if (!deliveryData.lastName || !deliveryData.lastName.trim()) {
      alert(t('checkout.delivery.validation.lastNameRequired'))
      return
    }
    if (deliveryData.deliveryMethod === 'pickup') {
      if (!deliveryData.contactPhone) {
        alert(t('checkout.delivery.contact.phoneRequired'))
        return
      }
      // Validate Chilean phone format
      if (deliveryData.contactPhone.startsWith('+56')) {
        const digitsAfterCode = deliveryData.contactPhone.replace('+56', '')
        if (digitsAfterCode.length !== 9 || !/^\d{9}$/.test(digitsAfterCode)) {
          alert(t('checkout.delivery.contact.phoneInvalidChile'))
          return
        }
      }
    }
    if (deliveryData.deliveryMethod === 'courier') {
      if (!deliveryData.shippingRegion) {
        alert(t('checkout.delivery.validation.regionRequired'))
        return
      }
      if (!deliveryData.shippingCity) {
        alert(t('checkout.delivery.validation.cityRequired'))
        return
      }
      if (!deliveryData.shippingCommune) {
        alert(t('checkout.delivery.validation.communeRequired'))
        return
      }
      if (!deliveryData.shippingAddressLine1) {
        alert(t('checkout.delivery.validation.addressRequired'))
        return
      }
    }
    
    try {
      setRedirecting(true)
      const res = await fetch('/api/checkout', { 
        method: 'POST', 
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(deliveryData),
      })
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
          alert(t('errors.purchaseLimitExceededUser', { 
            maxAllowed: limitInfo.maxAllowed, 
            windowDays: limitInfo.windowDays, 
            alreadyCommitted: limitInfo.alreadyCommitted 
          }))
        } else {
          alert(t('errors.someItemsExceedLimits'))
        }
      } else if (json?.error === 'minimum_order_not_met') {
        alert(t('errors.minimumOrderNotMet', { 
          required: formatPrice(json.required || 0, config), 
          amount: formatPrice((json.required || 0) - (json.current || 0), config) 
        }))
      } else if (json?.error === 'configuration_error') {
        // Show descriptive message for configuration errors
        alert(json?.message || t('errors.configurationError'))
      } else {
        // Prioritize message over error code for better UX
        alert(json?.message || json?.error || t('errors.unableToCheckout'))
      }
    } catch (e: any) {
      alert(e?.message || t('errors.unableToCheckout'))
    } finally {
      setRedirecting(false)
    }
  }

  return (
    <SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: false, refreshInterval: 0, dedupingInterval: 4000 }}>
    <div className="mx-auto max-w-4xl p-2 md:p-6">
      <h1 className="text-3xl font-bold mb-6">{t('cart.title')}</h1>
      {showSkeleton ? (
        <CartPageSkeleton itemCount={3} />
      ) : null}
      {error ? <div className="mt-4 text-red-600">{error}</div> : null}
      {!loading && items.length === 0 ? (
        <div className="mt-6">
          <p>{t('cart.empty')}</p>
          <div className="mt-4"><Link href="/mtg" className="btn">{t('cart.browseCards')}</Link></div>
        </div>
      ) : null}
      {items.length > 0 && (
        <>
          {/* Cards Subtotal Summary */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{t('cart.cardsSubtotal')}</span>
              <span className="text-2xl font-bold tabular-nums">{formatPrice(subtotal, config)}</span>
            </div>
          </div>
          
          {/* Card Items List */}
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
                  <button className="btn btn-sm" onClick={() => update(it.printingId, 'inc', -1, it.finish)} aria-label={t('cart.decreaseQuantity')}>−</button>
                  <div className="w-8 text-center tabular-nums">{it.quantity}</div>
                  <button 
                    className="btn btn-sm" 
                    onClick={() => update(it.printingId, 'inc', 1, it.finish)} 
                    aria-label={t('cart.increaseQuantity')}
                    disabled={it.quantity >= 4}
                  >+</button>
                </div>
                <div className="w-20 text-right tabular-nums">{formatPrice(it.unitPrice, config)}</div>
                <div className="w-24 text-right tabular-nums font-bold">{formatPrice(it.lineTotal, config)}</div>
                <div>
                  <button className="btn btn-ghost" onClick={() => update(it.printingId, 'remove', undefined, it.finish)}>{t('common.remove')}</button>
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
                    <button className="btn btn-sm" onClick={() => update(it.printingId, 'inc', -1, it.finish)} aria-label={t('cart.decreaseQuantity')}>−</button>
                    <div className="w-8 text-center tabular-nums">{it.quantity}</div>
                    <button 
                      className="btn btn-sm" 
                      onClick={() => update(it.printingId, 'inc', 1, it.finish)} 
                      aria-label={t('cart.increaseQuantity')}
                      disabled={it.quantity >= 4}
                    >+</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm tabular-nums">{formatPrice(it.unitPrice, config)} {t('cart.each')}</div>
                    <div className="text-lg font-bold tabular-nums">{formatPrice(it.lineTotal, config)}</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => update(it.printingId, 'remove', undefined, it.finish)}>{t('common.remove')}</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {items.length > 0 && (
        <>
          {/* Delivery Method Selection */}
          <DeliveryMethodSelector
            value={deliveryData}
            onChange={setDeliveryData}
            shippingCost={deliveryData.deliveryMethod === 'courier' && deliveryData.shippingRegion ? shipping : undefined}
            isGuest={!authed}
          />
          
          <div className="mt-6 ml-auto max-w-sm border rounded p-4">
            {/* Progress banners */}
            {!meetsMinimum && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <div className="font-medium text-yellow-800">{t('cart.minimumOrderRequired')}</div>
                <div className="text-yellow-700">
                  {t('cart.addAmountToReach', { 
                    amount: formatPrice(amountToMin, config), 
                    minimum: formatPrice(config?.minOrderSubtotalClp || 0, config) 
                  })}
                </div>
              </div>
            )}
            
            {config?.freeShippingThresholdClp && amountToFree > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <div className="font-medium text-blue-800">{t('cart.freeShippingAvailable')}</div>
                <div className="text-blue-700">
                  {t('cart.addAmountForFreeShipping', { amount: formatPrice(amountToFree, config) })}
                </div>
              </div>
            )}
            
            <div className="flex justify-between">
              <span>{t('cart.subtotal')}</span>
              <span className="tabular-nums">{formatPrice(subtotal, config)}</span>
            </div>
            {shipping > 0 && (
              <div className="flex justify-between">
                <span>{deliveryData.deliveryMethod === 'courier' ? t('cart.shippingChilexpress') : t('cart.shipping')}</span>
                <span className="tabular-nums">{formatPrice(shipping, config)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <span>{t('cart.total')}</span>
              <span className="tabular-nums">{formatPrice(total, config)}</span>
            </div>
            <div className="mt-4">
              {/* Debug: Show auth state for troubleshooting */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-2 text-xs text-gray-500">
                  Auth state: {authed === null ? 'null (checking...)' : authed === true ? 'true (logged in)' : 'false (guest)'}
                </div>
              )}
              {authed === true ? (
                <button 
                  className="btn btn-gradient w-full" 
                  onClick={checkoutUser} 
                  disabled={redirecting || !meetsMinimum} 
                  aria-busy={redirecting}
                  style={{ display: 'block', visibility: 'visible' }}
                >
                  {redirecting ? t('common.processing') : meetsMinimum ? t('cart.checkout') : t('cart.minimumOrderRequired')}
                </button>
              ) : (
                <button 
                  className="btn btn-gradient w-full" 
                  onClick={checkoutGuest}
                  disabled={!meetsMinimum || authed === null}
                  style={{ display: 'block', visibility: 'visible' }}
                >
                  {authed === null ? t('common.loading') : (meetsMinimum ? t('cart.checkoutAsGuest') : t('cart.minimumOrderRequired'))}
                </button>
              )}
            </div>
          </div>
        </>
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


