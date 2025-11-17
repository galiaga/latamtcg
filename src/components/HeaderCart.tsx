"use client"

import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from './CartProvider'
import { selectCartTotalCount } from '@/lib/cartSelectors'
import { useTranslations } from 'next-intl'

export default function HeaderCart() {
  const t = useTranslations()
  const { data } = useCart()
  const pathname = usePathname()
  const count = useMemo(() => selectCartTotalCount(data as any), [data])

  // Kick a refresh when navigating, so badge stays accurate after auth/checkout routes
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('cart:refresh')) } catch {}
  }, [pathname])

  const showBadge = count > 0

  return (
    <div className="relative">
      <Link href="/cart" className="btn" aria-label={showBadge ? t('cart.cartBadge', { count }) : t('common.cart')}>
        {/* Simple cart glyph for now; can be swapped with an SVG later */}
        <span aria-hidden>🛒</span>
        <span className="ml-2">{t('common.cart')}</span>
      </Link>
      {showBadge ? (
        <span
          className="chip-badge"
          style={{ position: 'absolute', top: -6, right: -6, boxShadow: 'var(--shadow)' }}
          aria-label={t('cart.itemsInCart', { count })}
          data-testid="cart-badge"
        >
          {count}
        </span>
      ) : null}
    </div>
  )
}


