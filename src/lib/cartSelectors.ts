// Re-export types from search.ts for consistency
export type { CartItem, CartData } from '@/types/search'
import type { CartData } from '@/types/search'

export function selectCartTotalCount(cart: CartData | null | undefined): number {
  if (!cart) return 0
  if (Array.isArray(cart.items) && cart.items.length > 0) {
    const sum = cart.items.reduce((acc, it) => acc + Number(it.quantity || 0), 0)
    if (Number.isFinite(sum) && sum >= 0) return sum
  }
  const coalesced = Number((cart as unknown as Record<string, unknown>)?.count || 0)
  return Number.isFinite(coalesced) && coalesced >= 0 ? coalesced : 0
}


