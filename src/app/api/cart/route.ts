export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/supabase'
import { getOrCreateUserCart } from '@/lib/cart'
import { getScryfallNormalUrl } from '@/lib/images'
import { getPricingConfig } from '@/lib/pricingData'
import { computePriceCLP } from '@/lib/pricing'
import { formatCardVariant } from '@/lib/cards/formatVariant'
import { formatDisplayName } from '@/lib/cardNames'

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
    const cards = await prisma.mtgCard.findMany({ 
      where: { scryfallId: { in: ids } }, 
      select: { 
        scryfallId: true, 
        name: true, 
        flavorName: true,
        setCode: true, 
        set: { select: { set_name: true } }, 
        collectorNumber: true, 
        priceUsd: true, 
        priceUsdFoil: true, 
        priceUsdEtched: true,
        finishes: true,
        promoTypes: true,
        frameEffects: true,
        borderColor: true
      } 
    })
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
      
      // Use stored unitPrice (in USD) - this was saved when the item was added with the correct variant
      let unitPrice = it.unitPrice != null ? Number(it.unitPrice) : 0
      
      if (pricingConfig && pricingConfig.useCLP && unitPrice > 0) {
        // Convert stored USD price to CLP using server-side function
        const clpPrice = computePriceCLP(unitPrice, {
          tcgPriceUsd: unitPrice,
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
      } else if (!it.unitPrice && c) {
        // Fallback: if no stored price, use best available (shouldn't happen normally)
        const usdPrice = c.priceUsdEtched ?? c.priceUsdFoil ?? c.priceUsd
        if (usdPrice && pricingConfig && pricingConfig.useCLP) {
          const clpPrice = computePriceCLP(Number(usdPrice), {
            tcgPriceUsd: Number(usdPrice),
            fxClp: pricingConfig.fxClp,
            alphaLow: pricingConfig.alphaLow,
            alphaMid: pricingConfig.alphaMid,
            alphaHigh: pricingConfig.alphaHigh,
            alphaTierLowUsd: pricingConfig.alphaTierLowUsd,
            alphaTierMidUsd: pricingConfig.alphaTierMidUsd,
            betaClp: 0,
            priceMinPerCardClp: pricingConfig.priceMinPerCardClp,
            roundToStepClp: pricingConfig.roundToStepClp
          })
          unitPrice = clpPrice
        } else if (usdPrice) {
          unitPrice = Number(usdPrice)
        }
      }
      
      const lineTotal = unitPrice * it.quantity
      
      // Get finish from stored cart item (now stored in database)
      const storedFinish = it.finish || 'normal'
      const finish: 'normal' | 'foil' | 'etched' = (storedFinish === 'foil' || storedFinish === 'etched') ? storedFinish : 'normal'
      
      // Generate variant suffix for display name
      let variantSuffix = ''
      let finishLabel = ''
      if (c) {
        const variant = formatCardVariant({
          finishes: c.finishes || [],
          promoTypes: c.promoTypes || [],
          frameEffects: c.frameEffects || [],
          borderColor: c.borderColor
        })
        variantSuffix = variant.suffix
        
        // Set finish label based on stored finish
        if (finish === 'etched') {
          finishLabel = 'Etched'
        } else if (finish === 'foil') {
          finishLabel = 'Foil'
        } else {
          finishLabel = 'Normal'
        }
      }
      
      // Format display name with flavor name and variant suffix
      const baseName = String(c?.name || '(Unknown)')
      const flavorName = c?.flavorName || null
      const displayName = formatDisplayName(baseName, flavorName) + variantSuffix
      
      const setCode = String(c?.setCode || '')
      // Access set relation safely
      const setName = (c as { set?: { set_name?: unknown } })?.set?.set_name ? String((c as { set: { set_name: string } }).set.set_name) : null
      const collectorNumber = String(c?.collectorNumber || '')
      return {
        printingId: it.printingId,
        finish: storedFinish, // Include finish for cart operations
        quantity: it.quantity,
        unitPrice,
        lineTotal,
        name: displayName, // Use full display name with variant suffix
        setCode,
        setName,
        collectorNumber,
        imageUrl: getScryfallNormalUrl(it.printingId),
        finishLabel: finishLabel, // Add finish label for display
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


