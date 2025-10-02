import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/supabase'

export async function POST() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  // Use user's active cart
  const cart = await prisma.cart.findFirst({ where: { userId: user.id, checkedOutAt: null }, select: { id: true } })
  if (!cart) return NextResponse.json({ error: 'cart_empty' }, { status: 400 })

  const cartItems = await prisma.cartItem.findMany({ where: { cartId: cart.id } })
  if (cartItems.length === 0) return NextResponse.json({ error: 'cart_empty' }, { status: 400 })

  // Coalesce prices from stored unitPrice; if missing, fallback to current price snapshot
  const enriched = await Promise.all(cartItems.map(async (ci) => {
    if (ci.unitPrice != null) return { ...ci, price: ci.unitPrice }
    const card = await prisma.mtgCard.findUnique({ where: { scryfallId: ci.printingId }, select: { priceUsd: true, priceUsdFoil: true, priceUsdEtched: true } })
    const price = (card?.priceUsdEtched ?? card?.priceUsdFoil ?? card?.priceUsd) ?? null
    return { ...ci, price }
  }))
  if (enriched.some((it) => it.price == null)) return NextResponse.json({ error: 'pricing_unavailable' }, { status: 409 })

  const total = enriched.reduce((sum, it) => sum + (Number(it.price) * it.quantity), 0)

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      totalAmount: total,
      items: { create: enriched.map((it) => ({ printingId: it.printingId, quantity: it.quantity, unitPrice: it.price! })) },
    },
    select: { id: true }
  })

  await prisma.cart.update({ where: { id: cart.id }, data: { checkedOutAt: new Date() } })

  return NextResponse.json({ ok: true, orderId: order.id })
}


