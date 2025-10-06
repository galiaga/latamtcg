import { describe, it, expect } from 'vitest'
import { selectCartTotalCount, type CartData } from '@/lib/cartSelectors'

describe('selectCartTotalCount', () => {
  it('returns 0 for null/undefined', () => {
    expect(selectCartTotalCount(null as any)).toBe(0)
    expect(selectCartTotalCount(undefined as any)).toBe(0)
  })

  it('sums quantities when items are available', () => {
    const cart: CartData = {
      items: [
        { printingId: 'a', quantity: 2, unitPrice: 1, lineTotal: 2, name: 'A', setCode: 'x', setName: null, collectorNumber: '1', imageUrl: '' },
        { printingId: 'b', quantity: 3, unitPrice: 1, lineTotal: 3, name: 'B', setCode: 'x', setName: null, collectorNumber: '2', imageUrl: '' },
      ],
      subtotal: 5,
      total: 5,
      count: 999,
    }
    expect(selectCartTotalCount(cart)).toBe(5)
  })

  it('falls back to count when items missing', () => {
    const cart = { items: [], subtotal: 0, total: 0, count: 7 } as unknown as CartData
    expect(selectCartTotalCount(cart)).toBe(7)
  })

  it('guards against NaN/negative', () => {
    const cart = { items: [{ printingId: 'x', quantity: -5 } as any], subtotal: 0, total: 0, count: -1 } as unknown as CartData
    expect(selectCartTotalCount(cart)).toBe(0)
  })
})


