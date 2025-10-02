import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateAnonymousCart } from '@/lib/cart'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { printingId?: string, quantity?: number }
  const printingId = String(body.printingId || '').trim()
  const qtyRaw = Number(body.quantity)
  const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1
  if (!printingId) return NextResponse.json({ error: 'invalid_printing' }, { status: 400 })

  const { id: cartId } = await getOrCreateAnonymousCart()

  // Find or create line
  const existing = await prisma.cartItem.findFirst({ where: { cartId, printingId }, select: { id: true, quantity: true, unitPrice: true } })

  // Capture current price snapshot if missing
  let unitPrice = existing?.unitPrice ?? null
  if (unitPrice == null) {
    const card = await prisma.mtgCard.findUnique({ where: { scryfallId: printingId }, select: { priceUsd: true, priceUsdFoil: true, priceUsdEtched: true } })
    const price = (card?.priceUsdEtched ?? card?.priceUsdFoil ?? card?.priceUsd) ?? null
    unitPrice = price
  }

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity, unitPrice: unitPrice ?? existing.unitPrice } })
  } else {
    await prisma.cartItem.create({ data: { cartId, printingId, quantity, unitPrice } })
  }

  // Return updated summary
  const items = await prisma.cartItem.findMany({ where: { cartId } })
  const subtotal = items.reduce((sum, it) => sum + (Number(it.unitPrice ?? 0) * it.quantity), 0)
  const count = items.reduce((sum, it) => sum + it.quantity, 0)

  return NextResponse.json({ ok: true, cart: { count, subtotal } })
}


