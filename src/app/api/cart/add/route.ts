import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateAnonymousCart, getOrCreateUserCart } from '@/lib/cart'
import { getSessionUser } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  let dbMs = 0
  const body = await req.json().catch(() => ({})) as { printingId?: string, quantity?: number, condition?: string, finish?: string, requestId?: string }
  const printingId = String(body.printingId || '').trim()
  const requestId = String(body.requestId || '').trim() || null
  const qtyRaw = Number(body.quantity)
  const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1
  if (!printingId) return NextResponse.json({ error: 'invalid_printing' }, { status: 400 })

  // Prefer authenticated user's cart; fallback to anonymous
  const user = await getSessionUser()
  const { id: cartId } = user
    ? await getOrCreateUserCart(user.id)
    : await getOrCreateAnonymousCart()


  // Capture price snapshot (one query)
  const t1 = Date.now()
  const card = await prisma.mtgCard.findUnique({ where: { scryfallId: printingId }, select: { priceUsd: true, priceUsdFoil: true, priceUsdEtched: true } })
  dbMs += Date.now() - t1
  const unitPrice = (card?.priceUsdEtched ?? card?.priceUsdFoil ?? card?.priceUsd) ?? null

  // Idempotency: record request if provided
  try {
    if (requestId) {
      await prisma.kvMeta.create({ data: { key: `cart:add:${cartId}:${requestId}`, value: JSON.stringify({ at: Date.now() }) } })
    }
  } catch {}

  // Single write: create or increment
  const t2 = Date.now()
  await prisma.$transaction(async (tx) => {
    const line = await tx.cartItem.findFirst({ where: { cartId, printingId }, select: { id: true, quantity: true, unitPrice: true } })
    if (line) {
      await tx.cartItem.update({ where: { id: line.id }, data: { quantity: line.quantity + quantity, unitPrice: unitPrice ?? line.unitPrice } })
    } else {
      await tx.cartItem.create({ data: { cartId, printingId, quantity, unitPrice } })
    }
  })
  dbMs += Date.now() - t2

  // Fast summary
  const t3 = Date.now()
  const items = await prisma.cartItem.findMany({ where: { cartId }, select: { quantity: true, unitPrice: true } })
  dbMs += Date.now() - t3
  const totalPrice = items.reduce((sum, it) => sum + (Number(it.unitPrice ?? 0) * it.quantity), 0)
  const totalCount = items.reduce((sum, it) => sum + it.quantity, 0)

  const res = NextResponse.json({ ok: true, totalCount, totalPrice })
  res.headers.set('X-Server-Timing', `db;dur=${dbMs},total;dur=${Date.now()-t0}`)
  return res
}


