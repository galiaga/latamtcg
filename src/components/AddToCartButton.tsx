"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCart } from './CartProvider'
import Spinner from './Spinner'
import { useTranslations } from 'next-intl'

export default function AddToCartButton({ printingId, size = 'md', title, variant }: { printingId: string; size?: 'sm' | 'md' | 'lg' | 'xs'; title?: string; variant?: 'normal' | 'foil' | 'etched' }) {
  const t = useTranslations()
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
    const finish = variant || 'normal'
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {}, 250)
    const key = `${printingId}:${finish}`
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
        body: JSON.stringify({ printingId, quantity: 1, requestId, finish }),
      }).then(async (r) => {
        if (!r.ok) {
          const errorData = await r.json().catch(() => ({}))
          if (errorData.error === 'purchase_limit_exceeded') {
            // Show user-friendly error message for purchase limits
            alert(errorData.message || t('errors.purchaseLimitExceeded', { maxAllowed: 1 }))
            throw new Error('Purchase limit exceeded')
          }
          return {}
        }
        setOk(true)
        const json = await r.json().catch(() => ({})) as any
        return { totalCount: Number(json?.totalCount), totalPrice: Number(json?.totalPrice) }
      })
      await addOptimisticThenReconcile(postPromise)
    } finally {
      setAdding(false)
      inFlightRef.current.delete(key)
    }
  }, [printingId, variant, addOptimisticThenReconcile, mutate])

  // Use new styling for card tiles, fallback to old styling for other contexts
  const isCardTile = size === 'md' && title
  const baseClasses = isCardTile 
    ? 'inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-150 active:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 rounded-lg'
    : size === 'xs' ? 'inline-flex items-center justify-center text-xs leading-none px-2 py-1 h-5 text-white focus:outline-none focus:ring-2 transition-all duration-200 rounded' : 
      size === 'sm' ? 'inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-2 transition-all duration-200 rounded-lg' : 
      size === 'lg' ? 'inline-flex items-center justify-center px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 transition-all duration-200 rounded-lg' : 
      'inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 transition-all duration-200 rounded-lg'

  const ariaLabel = title ? `Add to cart: ${title}` : 'Add to cart'

  // Don't render if no printingId - but log for debugging
  if (!printingId || printingId.trim() === '') {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[AddToCartButton] No printingId provided', { printingId, title })
    }
    return null
  }

  return (
    <button 
      type="button" 
      className={baseClasses}
      style={{
        backgroundColor: '#7c3aed', // brand-600 purple
        color: '#ffffff',
        border: '2px solid #7c3aed', // Add border for visibility
        cursor: adding ? 'wait' : 'pointer',
        display: 'inline-flex', // Force display
        visibility: 'visible', // Force visibility
        opacity: adding ? 0.6 : 1,
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)', // Add shadow for visibility
        whiteSpace: 'nowrap', // Prevent text wrapping
      }}
      onMouseEnter={(e) => {
        if (!adding) {
          e.currentTarget.style.backgroundColor = '#8b5cf6' // brand-500
        }
      }}
      onMouseLeave={(e) => {
        if (!adding) {
          e.currentTarget.style.backgroundColor = '#7c3aed' // brand-600
        }
      }}
      disabled={adding} 
      aria-disabled={adding} 
      onClick={add} 
      aria-busy={adding}
      aria-label={ariaLabel}
    >
      {adding ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          {t('common.adding')}
        </span>
      ) : ok ? t('common.added') : t('common.addToCart')}
    </button>
  )
}


