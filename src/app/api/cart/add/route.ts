import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateAnonymousCart, getOrCreateUserCart } from '@/lib/cart'
import { getSessionUser } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
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
    
    // Select price based on finish/variant
    const finish = (body.finish || 'normal') as 'normal' | 'foil' | 'etched'
    let unitPrice: number | null = null
    if (finish === 'etched' && card?.priceUsdEtched) {
      unitPrice = Number(card.priceUsdEtched)
    } else if (finish === 'foil' && card?.priceUsdFoil) {
      unitPrice = Number(card.priceUsdFoil)
    } else if (finish === 'normal' && card?.priceUsd) {
      unitPrice = Number(card.priceUsd)
    } else {
      // Fallback to best available price if requested finish not available
      unitPrice = (card?.priceUsdEtched ?? card?.priceUsdFoil ?? card?.priceUsd) ? Number(card?.priceUsdEtched ?? card?.priceUsdFoil ?? card?.priceUsd) : null
    }

    // Idempotency: record request if provided
    try {
      if (requestId) {
        await prisma.kvMeta.create({ data: { key: `cart:add:${cartId}:${requestId}`, value: JSON.stringify({ at: Date.now() }) } })
      }
    } catch {}

    // Single write: create or increment (checking both printingId AND finish)
    const t2 = Date.now()
    await prisma.$transaction(async (tx) => {
      // Normalize finish to always be a string (never null)
      const normalizedFinish = finish || 'normal'
      
      // Try to find existing item by printingId and finish
      // If finish column doesn't exist in DB, this will fail and we'll fall back
      let line = null
      try {
        line = await tx.cartItem.findFirst({ 
          where: { 
            cartId, 
            printingId,
            finish: normalizedFinish
          }, 
          select: { id: true, quantity: true, unitPrice: true, finish: true } 
        })
      } catch (err: any) {
        // If finish column doesn't exist, fall back to finding by printingId only
        const errorMsg = err?.message || String(err)
        if (errorMsg.includes('finish') || errorMsg.includes('column') || (err as any)?.code === 'P2021' || (err as any)?.code === '42703') {
          // Column doesn't exist - use legacy behavior (find by printingId only)
          line = await tx.cartItem.findFirst({ 
            where: { 
              cartId, 
              printingId
            }, 
            select: { id: true, quantity: true, unitPrice: true } 
          })
        } else {
          throw err
        }
      }
      
      if (line) {
        // Update existing item
        const updateData: any = { 
          quantity: line.quantity + quantity, 
          unitPrice: unitPrice ?? line.unitPrice
        }
        
        // Try to include finish if the column exists
        try {
          updateData.finish = normalizedFinish
          await tx.cartItem.update({ 
            where: { id: line.id }, 
            data: updateData
          })
        } catch (err: any) {
          // If finish column doesn't exist, update without it
          const errorMsg = err?.message || String(err)
          if (errorMsg.includes('finish') || errorMsg.includes('column') || (err as any)?.code === 'P2021' || (err as any)?.code === '42703') {
            delete updateData.finish
            await tx.cartItem.update({ 
              where: { id: line.id }, 
              data: updateData
            })
          } else {
            throw err
          }
        }
      } else {
        // Create new item
        const createData: any = { 
          cartId, 
          printingId, 
          quantity, 
          unitPrice
        }
        
        // Try to include finish
        try {
          createData.finish = normalizedFinish
          await tx.cartItem.create({ 
            data: createData
          })
        } catch (err: any) {
          // If finish column doesn't exist, create without it
          const errorMsg = err?.message || String(err)
          if (errorMsg.includes('finish') || errorMsg.includes('column') || (err as any)?.code === 'P2021' || (err as any)?.code === '42703') {
            delete createData.finish
            await tx.cartItem.create({ 
              data: createData
            })
          } else {
            throw err
          }
        }
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
  } catch (error) {
    console.error('[cart/add] Error:', error)
    console.error('[cart/add] Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('[cart/add] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
    })
    
    // Check if error is related to missing finish column
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isFinishError = errorMessage.includes('finish') || errorMessage.includes('column') || (error as any)?.code === 'P2021'
    
    if (isFinishError) {
      console.error('[cart/add] Finish column may not exist in database. Migration may be needed.')
      return NextResponse.json({ 
        error: 'database_schema_error', 
        message: 'Cart database schema needs to be updated. Please run database migrations.',
        details: 'The finish column may be missing from CartItem table. Run: npx prisma migrate deploy'
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to add to cart', 
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}


