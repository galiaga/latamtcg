import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

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
  try { (store as any).set?.(CART_COOKIE, newToken, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 60*60*24*30 }) } catch {}
  return cart
}

export async function getOrCreateUserCart(userId: string) {
  const existing = await prisma.cart.findFirst({ where: { userId, checkedOutAt: null }, select: { id: true } })
  if (existing) return existing
  return prisma.cart.create({ data: { userId }, select: { id: true } })
}

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
  try { (store as any).delete?.(CART_COOKIE) } catch {}
  return { merged: true }
}


