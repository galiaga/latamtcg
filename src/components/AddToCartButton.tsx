"use client"

import { useCallback, useEffect, useState } from 'react'

export default function AddToCartButton({ printingId, size = 'md' }: { printingId: string; size?: 'sm' | 'md' | 'lg' }) {
  const [adding, setAdding] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!ok) return
    const t = setTimeout(() => setOk(false), 1200)
    return () => clearTimeout(t)
  }, [ok])

  const add = useCallback(async () => {
    if (!printingId) return
    setAdding(true)
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ printingId, quantity: 1 }),
      })
      if (res.ok) {
        setOk(true)
        try { window.dispatchEvent(new CustomEvent('cart:refresh')) } catch {}
      }
    } finally {
      setAdding(false)
    }
  }, [printingId])

  const className = size === 'sm' ? 'btn btn-sm btn-gradient' : size === 'lg' ? 'btn btn-lg btn-gradient' : 'btn btn-gradient'

  return (
    <button type="button" className={className} disabled={adding} onClick={add} aria-busy={adding}>
      {adding ? 'Adding…' : ok ? 'Added ✓' : 'Add to cart'}
    </button>
  )
}


