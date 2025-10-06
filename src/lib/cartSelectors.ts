export type CartItem = { printingId: string; quantity: number; unitPrice: number; lineTotal: number; name: string; setCode: string; setName: string | null; collectorNumber: string; imageUrl: string }
export type CartData = { items: CartItem[]; subtotal: number; total: number; count: number }

export function selectCartTotalCount(cart: CartData | null | undefined): number {
  if (!cart) return 0
  if (Array.isArray(cart.items) && cart.items.length > 0) {
    const sum = cart.items.reduce((acc, it) => acc + Number(it.quantity || 0), 0)
    if (Number.isFinite(sum) && sum >= 0) return sum
  }
  const coalesced = Number((cart as any)?.count || 0)
  return Number.isFinite(coalesced) && coalesced >= 0 ? coalesced : 0
}


