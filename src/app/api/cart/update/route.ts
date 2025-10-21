import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/supabase'
import { getOrCreateUserCart } from '@/lib/cart'

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  let dbMs = 0
  const body = await req.json().catch(() => ({})) as { action?: 'set' | 'inc' | 'remove', printingId?: string, quantity?: number }
  const action = (body.action || 'set') as 'set' | 'inc' | 'remove'
  const printingId = String(body.printingId || '').trim()
  if (!printingId) return NextResponse.json({ error: 'invalid_printing' }, { status: 400 })

  // If authenticated, operate on the user's cart. Otherwise use guest cart via cookie.
  const user = await getSessionUser()
  let cartId: string | null = null
  if (user) {
    const uc = await getOrCreateUserCart(user.id)
    cartId = uc.id
  } else {
    const store = await cookies()
    const token = store.get('cart_token')?.value || null
    if (token) {
      const cart = await prisma.cart.findFirst({ where: { token, checkedOutAt: null }, select: { id: true } })
      cartId = cart?.id || null
    }
  }
  if (!cartId) return NextResponse.json({ error: 'cart_not_found' }, { status: 404 })

  const t1 = Date.now()
  const line = await prisma.cartItem.findFirst({ where: { cartId, printingId }, select: { id: true, quantity: true } })
  dbMs += Date.now() - t1
  if (!line) return NextResponse.json({ error: 'line_not_found' }, { status: 404 })

  if (action === 'remove') {
    const t2 = Date.now()
    await prisma.cartItem.delete({ where: { id: line.id } })
    dbMs += Date.now() - t2
  } else {
    const qRaw = Number(body.quantity)
    const delta = Number.isFinite(qRaw) ? Math.floor(qRaw) : 1
    const nextQty = action === 'inc' ? Math.max(1, line.quantity + delta) : Math.max(1, delta)
    
    
    const t2 = Date.now()
    await prisma.cartItem.update({ where: { id: line.id }, data: { quantity: nextQty } })
    dbMs += Date.now() - t2
  }

  // Return updated summary for instant reconciliation
  const t3 = Date.now()
  const items = await prisma.cartItem.findMany({ where: { cartId }, select: { quantity: true, unitPrice: true } })
  dbMs += Date.now() - t3
  const totalPrice = items.reduce((sum, it) => sum + (Number(it.unitPrice ?? 0) * it.quantity), 0)
  const totalCount = items.reduce((sum, it) => sum + it.quantity, 0)
  const res = NextResponse.json({ ok: true, totalCount, totalPrice })
  res.headers.set('X-Server-Timing', `db;dur=${dbMs},total;dur=${Date.now()-t0}`)
  return res
}


