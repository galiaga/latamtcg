"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from './CartProvider'
import { selectCartTotalCount } from '@/lib/cartSelectors'

export default function HeaderCart() {
  const { data, loading } = useCart()
  const pathname = usePathname()
  const count = useMemo(() => selectCartTotalCount(data as any), [data])

  // Kick a refresh when navigating, so badge stays accurate after auth/checkout routes
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('cart:refresh')) } catch {}
  }, [pathname])

  const showBadge = count > 0

  return (
    <div className="relative">
      <Link href="/cart" className="btn" aria-label={showBadge ? `Cart (${count})` : 'Cart'}>
        {/* Simple cart glyph for now; can be swapped with an SVG later */}
        <span aria-hidden>🛒</span>
        <span className="ml-2">Cart</span>
      </Link>
      {showBadge ? (
        <span
          className="chip-badge"
          style={{ position: 'absolute', top: -6, right: -6, boxShadow: 'var(--shadow)' }}
          aria-label={`${count} items in cart`}
          data-testid="cart-badge"
        >
          {count}
        </span>
      ) : null}
    </div>
  )
}


