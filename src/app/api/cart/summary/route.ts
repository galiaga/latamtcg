export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/supabase'

export async function GET() {
  const t0 = Date.now()
  let dbMs = 0
  try {
    let cartId: string | null = null
    const user = await getSessionUser()
    if (user) {
      const t1 = Date.now()
      const cart = await prisma.cart.findFirst({ where: { userId: user.id, checkedOutAt: null }, select: { id: true } })
      dbMs += Date.now() - t1
      cartId = cart?.id || null
    } else {
      const store = await cookies()
      const token = store.get('cart_token')?.value || null
      if (token) {
        const t1 = Date.now()
        const cart = await prisma.cart.findFirst({ where: { token, checkedOutAt: null }, select: { id: true } })
        dbMs += Date.now() - t1
        cartId = cart?.id || null
      }
    }
    if (!cartId) {
      const res = NextResponse.json({ totalCount: 0, totalPrice: 0 })
      res.headers.set('X-Server-Timing', `db;dur=${dbMs},total;dur=${Date.now()-t0}`)
      return res
    }

    const t2 = Date.now()
    const items = await prisma.cartItem.findMany({ where: { cartId }, select: { quantity: true, unitPrice: true } })
    dbMs += Date.now() - t2
    const totalCount = items.reduce((s, it) => s + it.quantity, 0)
    const totalPrice = items.reduce((s, it) => s + Number(it.unitPrice ?? 0) * it.quantity, 0)

    const res = NextResponse.json({ totalCount, totalPrice })
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')
    res.headers.set('X-Server-Timing', `db;dur=${dbMs},total;dur=${Date.now()-t0}`)
    return res
  } catch {
    const res = NextResponse.json({ totalCount: 0, totalPrice: 0 })
    res.headers.set('X-Server-Timing', `db;dur=${dbMs},total;dur=${Date.now()-t0}`)
    return res
  }
}


