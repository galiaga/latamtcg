import { cache } from 'react'
import { prisma } from '@/lib/prisma'

type MinimalCart = { id: string }

export const getOrCreateUserCart = cache(async (userId: string): Promise<MinimalCart> => {
  // Existing function was imported in api/cart. Wrap with react.cache to coalesce SSR/RSC duplicates.
  const found = await prisma.cart.findFirst({ where: { userId, checkedOutAt: null }, select: { id: true } })
  if (found) return { id: found.id }
  const created = await prisma.cart.create({ data: { userId }, select: { id: true } })
  return { id: created.id }
})
import { cookies } from 'next/headers'

const CART_COOKIE = 'cart_token'

export async function getOrCreateAnonymousCart(): Promise<{ id: string, token: string | null }> {
  const store = await cookies()
  const token = store.get(CART_COOKIE)?.value
  if (token) {
    const found = await prisma.cart.findFirst({ where: { token, checkedOutAt: null }, select: { id: true, token: true } })
    if (found) return found
  }
  const newToken = crypto.randomUUID()
  const cart = await prisma.cart.create({ data: { token: newToken }, select: { id: true, token: true } })
  try { (store as { set?: (name: string, value: string, options: Record<string, unknown>) => void }).set?.(CART_COOKIE, newToken, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 60*60*24*30 }) } catch {}
  return cart
}

// getOrCreateUserCart is provided above (cached)

export async function mergeAnonymousCartIntoUser(userId: string) {
  const store = await cookies()
  const token = store.get(CART_COOKIE)?.value
  if (!token) return { merged: false }
  const anon = await prisma.cart.findFirst({ where: { token, checkedOutAt: null }, select: { id: true } })
  if (!anon) return { merged: false }

  const userCart = await getOrCreateUserCart(userId)
  if (userCart.id === anon.id) return { merged: false }

  // Merge items (sum quantities for same printingId)
  const [anonItems, userItems] = await Promise.all([
    prisma.cartItem.findMany({ where: { cartId: anon.id }, select: { printingId: true, quantity: true, unitPrice: true } }),
    prisma.cartItem.findMany({ where: { cartId: userCart.id }, select: { printingId: true, quantity: true, unitPrice: true, id: true } }),
  ])
  const userMap = new Map(userItems.map(i => [i.printingId, i]))
  for (const ai of anonItems) {
    const existing = userMap.get(ai.printingId)
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + ai.quantity } })
    } else {
      await prisma.cartItem.create({ data: { cartId: userCart.id, printingId: ai.printingId, quantity: ai.quantity, unitPrice: ai.unitPrice } })
    }
  }
  // Remove anon cart
  await prisma.cart.delete({ where: { id: anon.id } })
  try {
    (store as { delete?: (name: string) => void }).delete?.(CART_COOKIE)
  } catch {}
  try {
    (store as { set?: (name: string, value: string, options: Record<string, unknown>) => void }).set?.(CART_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 0 })
  } catch {}
  try {
    // Notify client to refresh cart state after merge
    if (typeof (globalThis as { window?: unknown }).window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('cart:refresh')) } catch {}
      try { localStorage.setItem('cart:pulse', String(Date.now())) } catch {}
    }
  } catch {}
  return { merged: true }
}


