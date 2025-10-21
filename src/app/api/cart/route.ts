export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/supabase'
import { getOrCreateUserCart } from '@/lib/cart'
import { getScryfallNormalUrl } from '@/lib/images'
import type { CartApiResponse } from '@/types/search'
import { CartResponseSchema } from '@/schemas/api'
import { getPricingConfig } from '@/lib/pricingData'
import { computePriceCLP } from '@/lib/pricing'

export async function GET(req: Request) {
  try {
    const t0 = Date.now()
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
    
    // Get pricing configuration with fallback
    let pricingConfig = null
    try {
      pricingConfig = await getPricingConfig()
    } catch (error) {
      console.warn('Failed to fetch pricing config, using fallback:', error)
      // Fallback configuration if database is not migrated yet
      pricingConfig = {
        id: 'fallback',
        useCLP: true,
        fxClp: 950,
        alphaTierLowUsd: 5,
        alphaTierMidUsd: 20,
        alphaLow: 0.9,
        alphaMid: 0.7,
        alphaHigh: 0.5,
        priceMinPerCardClp: 500,
        roundToStepClp: 500,
        minOrderSubtotalClp: 10000,
        shippingFlatClp: 2500,
        freeShippingThresholdClp: 25000,
        updatedAt: new Date(),
        createdAt: new Date()
      }
    }

    const items = rows.map((it) => {
      const c = map.get(it.printingId)
      
      // Use server-side pricing system
      let unitPrice = it.unitPrice != null ? Number(it.unitPrice) : 0
      
      if (pricingConfig && pricingConfig.useCLP) {
        // Get the best USD price
        const usdPrice = c?.priceUsdEtched ?? c?.priceUsdFoil ?? c?.priceUsd
        if (usdPrice) {
          // Compute CLP price using server-side function
          const clpPrice = computePriceCLP(Number(usdPrice), {
            tcgPriceUsd: Number(usdPrice),
            fxClp: pricingConfig.fxClp,
            alphaLow: pricingConfig.alphaLow,
            alphaMid: pricingConfig.alphaMid,
            alphaHigh: pricingConfig.alphaHigh,
            alphaTierLowUsd: pricingConfig.alphaTierLowUsd,
            alphaTierMidUsd: pricingConfig.alphaTierMidUsd,
            betaClp: 0, // Default to 0 for now
            priceMinPerCardClp: pricingConfig.priceMinPerCardClp,
            roundToStepClp: pricingConfig.roundToStepClp
          })
          unitPrice = clpPrice
        }
      }
      
      const lineTotal = unitPrice * it.quantity
      
      const name = String(c?.name || '(Unknown)')
      const setCode = String(c?.setCode || '')
      // Access set relation safely
      const setName = (c as { set?: { set_name?: unknown } })?.set?.set_name ? String((c as { set: { set_name: string } }).set.set_name) : null
      const collectorNumber = String(c?.collectorNumber || '')
      return {
        printingId: it.printingId,
        quantity: it.quantity,
        unitPrice,
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

    // ETag for quick 304s
    const etagBase = JSON.stringify({ count, subtotal: Math.round(subtotal), ids: items.map(i => i.printingId).join(','), q: items.map(i => i.quantity).join(',') })
    let etag = 'W/"' + Buffer.from(etagBase).toString('base64').slice(0, 32) + '"'
    try {
      // Cap length to keep header small
      if (etag.length > 40) etag = etag.slice(0, 40)
    } catch {}
    try {
      const ifNone = (req.headers as { get?: (name: string) => string | null }).get?.('if-none-match') || null
      if (ifNone && ifNone === etag) {
        return new NextResponse(null, { status: 304, headers: { 'ETag': etag, 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } })
      }
    } catch {}

    const resp = NextResponse.json({ items, subtotal, total: subtotal, count }, { headers: { 'ETag': etag, 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } })
    try { console.log(JSON.stringify({ event: 'cart.ms', ms: Date.now() - t0, items: items.length, count })) } catch {}
    return resp
  } catch (e) {
    try { console.error('[api/cart] failed; returning empty cart', e) } catch {}
    // Graceful fallback during DB connectivity issues
    return NextResponse.json({ items: [], subtotal: 0, total: 0, count: 0 })
  }
}


