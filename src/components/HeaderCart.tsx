"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function HeaderCart() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  async function fetchCount() {
    try {
      const res = await fetch('/api/cart', { cache: 'no-store' })
      const json = await res.json()
      const n = Number(json?.count || 0)
      if (!Number.isNaN(n)) setCount(n)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchCount()
    const onRefresh = () => fetchCount()
    // Listen to both legacy and new events
    window.addEventListener('cart:refresh', onRefresh as any)
    window.addEventListener('cart:changed', onRefresh as any)
    const onFocus = () => fetchCount()
    const onVis = () => { if (document.visibilityState === 'visible') fetchCount() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('cart:refresh', onRefresh as any)
      window.removeEventListener('cart:changed', onRefresh as any)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Also refresh on route changes (e.g., after auth navigations)
  useEffect(() => {
    fetchCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const showBadge = !loading && count > 0

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
          style={{ position: 'absolute', top: -6, right: -6 }}
          aria-label={`${count} items in cart`}
        >
          {count}
        </span>
      ) : null}
    </div>
  )
}


