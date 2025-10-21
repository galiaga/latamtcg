export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: string, items?: Array<{ printingId: string, quantity: number }> }
  const email = (body.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 })

  // Use existing anon cart if present, otherwise take items from body
  const store = await cookies()
  const token = store.get('cart_token')?.value
  let cart = token ? await prisma.cart.findFirst({ where: { token, checkedOutAt: null }, select: { id: true } }) : null
  if (!cart) {
    cart = await prisma.cart.create({ data: { token: null }, select: { id: true } })
    const items = Array.isArray(body.items) ? body.items : []
    for (const it of items) {
      const qty = Number.isFinite(it.quantity) && it.quantity > 0 ? Math.floor(it.quantity) : 1
      await prisma.cartItem.create({ data: { cartId: cart.id, printingId: String(it.printingId), quantity: qty } })
    }
  }

  // Price snapshot and order create
  const cartItems = await prisma.cartItem.findMany({ where: { cartId: cart.id } })
  if (cartItems.length === 0) return NextResponse.json({ error: 'cart_empty' }, { status: 400 })

  // Lightweight safety check: prevent checkout if any item has > 4 copies
  const maxCopiesPerItem = 4
  const violations = cartItems.filter(item => item.quantity > maxCopiesPerItem)
  
  if (violations.length > 0) {
    return NextResponse.json({ 
      error: 'purchase_limit_exceeded',
      message: `Some items exceed the maximum of ${maxCopiesPerItem} copies per item. Please reduce quantities and try again.`,
      violations: violations.map(v => ({ printingId: v.printingId, quantity: v.quantity }))
    }, { status: 400 })
  }

  // In v0 we trust stored unitPrice or fallback to current price from MtgCard
  const enriched = await Promise.all(cartItems.map(async (ci) => {
    if (ci.unitPrice != null) return { ...ci, price: ci.unitPrice as Prisma.Decimal }
    const card = await prisma.mtgCard.findUnique({ where: { scryfallId: ci.printingId }, select: { priceUsd: true, priceUsdFoil: true } })
    const price: Prisma.Decimal | null = (card?.priceUsd ?? card?.priceUsdFoil) ?? null
    return { ...ci, price }
  }))
  if (enriched.some(it => it.price == null)) {
    return NextResponse.json({ error: 'pricing_unavailable' }, { status: 409 })
  }
  const total = enriched.reduce((sum, it) => sum + (Number(it.price) * it.quantity), 0)

  // Create order and mark cart as checked out in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        email,
        totalAmount: new Prisma.Decimal(total.toFixed(2)),
        items: {
          create: enriched.map((it) => ({ printingId: it.printingId, quantity: it.quantity, unitPrice: it.price! }))
        }
      },
      select: { id: true }
    })

    await tx.cart.update({ where: { id: cart.id }, data: { checkedOutAt: new Date() } })
    
    return order
  })

  // Clear cookie after successful transaction
  try { store.delete('cart_token') } catch {}

  return NextResponse.json({ ok: true, orderId: result.id, inviteToSignUp: true })
}


