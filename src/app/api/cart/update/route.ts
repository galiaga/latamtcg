import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { action?: 'set' | 'inc' | 'remove', printingId?: string, quantity?: number }
  const action = (body.action || 'set') as 'set' | 'inc' | 'remove'
  const printingId = String(body.printingId || '').trim()
  if (!printingId) return NextResponse.json({ error: 'invalid_printing' }, { status: 400 })

  const store = await cookies()
  const token = store.get('cart_token')?.value || null
  if (!token) return NextResponse.json({ error: 'cart_not_found' }, { status: 404 })
  const cart = await prisma.cart.findFirst({ where: { token, checkedOutAt: null }, select: { id: true } })
  if (!cart) return NextResponse.json({ error: 'cart_not_found' }, { status: 404 })

  const line = await prisma.cartItem.findFirst({ where: { cartId: cart.id, printingId }, select: { id: true, quantity: true } })
  if (!line) return NextResponse.json({ error: 'line_not_found' }, { status: 404 })

  if (action === 'remove') {
    await prisma.cartItem.delete({ where: { id: line.id } })
  } else {
    const qRaw = Number(body.quantity)
    const delta = Number.isFinite(qRaw) ? Math.floor(qRaw) : 1
    const nextQty = action === 'inc' ? Math.max(1, line.quantity + delta) : Math.max(1, delta)
    await prisma.cartItem.update({ where: { id: line.id }, data: { quantity: nextQty } })
  }

  return NextResponse.json({ ok: true })
}


