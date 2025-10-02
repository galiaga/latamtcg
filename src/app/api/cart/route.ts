export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/supabase'
import { getOrCreateUserCart } from '@/lib/cart'
import { getScryfallNormalUrl } from '@/lib/images'

export async function GET() {
  try {
    // Prefer authenticated user's cart; fallback to guest cart cookie
    let cartId: string | null = null
    const user = await getSessionUser()
    if (user) {
      const uc = await getOrCreateUserCart(user.id)
      cartId = uc.id
    } else {
      const store = await cookies()
      const token = store.get('cart_token')?.value || null
      if (token) {
        const found = await prisma.cart.findFirst({ where: { token, checkedOutAt: null }, select: { id: true } })
        cartId = found?.id || null
      }
    }
    if (!cartId) return NextResponse.json({ items: [], subtotal: 0, total: 0, count: 0 })

    const rows = await prisma.cartItem.findMany({ where: { cartId }, orderBy: { createdAt: 'asc' } })
    if (rows.length === 0) return NextResponse.json({ items: [], subtotal: 0, total: 0, count: 0 })

    // Enrich with card details and compute price fallback
    const ids = Array.from(new Set(rows.map(r => r.printingId)))
    const cards = await prisma.mtgCard.findMany({ where: { scryfallId: { in: ids } }, select: { scryfallId: true, name: true, setCode: true, set: { select: { set_name: true } }, collectorNumber: true, priceUsd: true, priceUsdFoil: true, priceUsdEtched: true } })
    const map = new Map(cards.map((c) => [c.scryfallId, c]))

    const items = rows.map((it) => {
      const c = map.get(it.printingId)
      const coalesced = (it.unitPrice != null) ? Number(it.unitPrice) : Number((c?.priceUsdEtched ?? c?.priceUsdFoil ?? c?.priceUsd) ?? 0)
      const lineTotal = coalesced * it.quantity
      const name = String(c?.name || '(Unknown)')
      const setCode = String(c?.setCode || '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- access set relation quickly
      const setName = (c as any)?.set?.set_name ? String((c as any).set.set_name) : null
      const collectorNumber = String(c?.collectorNumber || '')
      return {
        printingId: it.printingId,
        quantity: it.quantity,
        unitPrice: coalesced,
        lineTotal,
        name,
        setCode,
        setName,
        collectorNumber,
        imageUrl: getScryfallNormalUrl(it.printingId),
      }
    })

    const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0)
    const count = items.reduce((sum, it) => sum + it.quantity, 0)
    return NextResponse.json({ items, subtotal, total: subtotal, count })
  } catch (e) {
    try { console.error('[api/cart] failed; returning empty cart', e) } catch {}
    // Graceful fallback during DB connectivity issues
    return NextResponse.json({ items: [], subtotal: 0, total: 0, count: 0 })
  }
}


