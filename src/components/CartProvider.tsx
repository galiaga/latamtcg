"use client"

import useSWR from 'swr'
import React, { createContext, useContext, useMemo } from 'react'

type CartItem = { printingId: string; quantity: number; unitPrice: number; lineTotal: number; name: string; setCode: string; setName: string | null; collectorNumber: string; imageUrl: string }
type CartData = { items: CartItem[]; subtotal: number; total: number; count: number }

const CartContext = createContext<{ data: CartData | null; loading: boolean; error: any; mutate: () => void }>({ data: null, loading: true, error: null, mutate: () => {} })

async function fetcher(url: string): Promise<CartData> {
  const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' })
  if (res.status === 304) {
    // Should be handled by browser cache; fallback to empty to avoid crashes
    return { items: [], subtotal: 0, total: 0, count: 0 }
  }
  return res.json()
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR<CartData>('/api/cart', fetcher, { dedupingInterval: 2000, revalidateOnFocus: true, revalidateIfStale: true, revalidateOnReconnect: true })
  const value = useMemo(() => ({ data: data || null, loading: isLoading, error, mutate: () => { mutate() } }), [data, error, isLoading, mutate])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}


