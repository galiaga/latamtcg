'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import Image from 'next/image'
import Link from 'next/link'

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
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.lineTotal, 0), [items])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cart', { cache: 'no-store' })
      const json = await res.json()
      setItems(Array.isArray(json?.items) ? json.items : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load cart')
    }
    setLoading(false)
    try { window.dispatchEvent(new CustomEvent('cart:refresh')) } catch {}
  }

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
    const onRefresh = () => refresh()
    window.addEventListener('cart:refresh', onRefresh as any)
    return () => window.removeEventListener('cart:refresh', onRefresh as any)
  }, [])

  async function update(printingId: string, action: 'inc' | 'set' | 'remove', quantity?: number) {
    try {
      await fetch('/api/cart/update', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, printingId, quantity }) })
      await refresh()
      try { window.dispatchEvent(new CustomEvent('cart:changed')) } catch {}
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
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Your Cart</h1>
      {loading ? <div className="mt-4">Loading…</div> : null}
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
              <div className="w-20 text-right tabular-nums">${Math.ceil(it.unitPrice)}</div>
              <div className="w-24 text-right tabular-nums font-medium">${Math.ceil(it.lineTotal)}</div>
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
            <span className="tabular-nums">${Math.ceil(subtotal)}</span>
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
  )
}


