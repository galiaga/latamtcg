"use client"

import useSWR, { type KeyedMutator } from 'swr'
import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react'

type CartItem = { printingId: string; quantity: number; unitPrice: number; lineTotal: number; name: string; setCode: string; setName: string | null; collectorNumber: string; imageUrl: string }
type CartData = { items: CartItem[]; subtotal: number; total: number; count: number }
type CartSummary = { totalCount: number; totalPrice: number }

type CartContextType = {
  data: CartData | null
  loading: boolean
  error: any
  mutate: KeyedMutator<CartData>
  addOptimisticThenReconcile: (p: Promise<{ totalCount?: number, totalPrice?: number }>) => Promise<void>
}
const CartContext = createContext<CartContextType>({ data: null, loading: true, error: null, mutate: (async () => undefined) as any, addOptimisticThenReconcile: async () => {} })

async function fetcher(url: string): Promise<CartData> {
  const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' })
  if (res.status === 304) {
    // Should be handled by browser cache; fallback to empty to avoid crashes
    return { items: [], subtotal: 0, total: 0, count: 0 }
  }
  return res.json()
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const isMutatingRef = useRef(false)
  const revalidateTimerRef = useRef<any>(null)
  const scheduleDebouncedRevalidate = () => {
    try { if (revalidateTimerRef.current) clearTimeout(revalidateTimerRef.current) } catch {}
    revalidateTimerRef.current = setTimeout(() => { try { mutate() } catch {} }, 900)
  }

  const { data, error, isLoading, mutate } = useSWR<CartData>('/api/cart/summary', async () => {
    const res = await fetch('/api/cart/summary', { headers: { accept: 'application/json' }, cache: 'no-store' })
    const s = (await res.json()) as CartSummary
    return { items: [], subtotal: s.totalPrice, total: s.totalPrice, count: s.totalCount }
  }, { dedupingInterval: 3000, revalidateOnFocus: false, revalidateIfStale: true, revalidateOnReconnect: false, revalidateOnMount: true })

  const addOptimisticThenReconcile = async (p: Promise<{ totalCount?: number, totalPrice?: number }>) => {
    if (isMutatingRef.current) return
    isMutatingRef.current = true
    const tClick = (typeof performance !== 'undefined' ? performance.now() : Date.now())
    try {
      const summary = await p
      const serverCount = Number(summary?.totalCount)
      const serverTotal = Number(summary?.totalPrice)
      await mutate((curr) => {
        const base = curr || { items: [], subtotal: 0, total: 0, count: 0 }
        const next = {
          ...base,
          count: Number.isFinite(serverCount) ? serverCount : base.count,
          subtotal: Number.isFinite(serverTotal) ? serverTotal : base.subtotal,
          total: Number.isFinite(serverTotal) ? serverTotal : base.total,
        }
        return next
      }, { revalidate: false })
      const tReconcile = (typeof performance !== 'undefined' ? performance.now() : Date.now())
      try { console.log(JSON.stringify({ event: 'cart.add_reconciled', t_click_to_reconcile_ms: Math.round(tReconcile - tClick) })) } catch {}
    } catch (e) {
      // fallback: schedule revalidate to recover
    } finally {
      isMutatingRef.current = false
      scheduleDebouncedRevalidate()
    }
  }

  // Listen to cart change events and cross-tab storage pulses to keep data fresh
  useEffect(() => {
    let timer: any = null
    const debouncedRefresh = () => {
      try {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => { try { mutate() } catch {} }, 50)
      } catch {}
    }
    const onRefresh = () => { debouncedRefresh() }
    const onChange = () => {
      // Optimistic only; reconciliation handled by addOptimisticThenReconcile
    }
    const onUpdate = (_e: Event) => {
      // No optimistic adjustment here; callers perform optimistic mutate directly.
    }
    const onReset = () => {
      try {
        mutate((curr) => ({ ...(curr || { items: [], subtotal: 0, total: 0, count: 0 }), count: 0, items: [], subtotal: 0, total: 0 }), { revalidate: true })
      } catch {}
    }
    const onStorage = (e: StorageEvent) => {
      try { if (e.key === 'cart:pulse') debouncedRefresh() } catch {}
    }
    try {
      window.addEventListener('cart:refresh', onRefresh as any)
      window.addEventListener('cart:changed', onChange as any)
      window.addEventListener('cart:update', onUpdate as any)
      window.addEventListener('cart:reset', onReset as any)
      window.addEventListener('storage', onStorage as any)
    } catch {}
    return () => {
      try {
        window.removeEventListener('cart:refresh', onRefresh as any)
        window.removeEventListener('cart:changed', onChange as any)
        window.removeEventListener('cart:update', onUpdate as any)
        window.removeEventListener('cart:reset', onReset as any)
        window.removeEventListener('storage', onStorage as any)
      } catch {}
    }
  }, [mutate])
  const value = useMemo<CartContextType>(() => ({ data: data || null, loading: isLoading, error, mutate, addOptimisticThenReconcile }), [data, error, isLoading, mutate])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}


