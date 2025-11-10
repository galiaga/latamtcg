export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/supabase'
import { getPricingConfig, getBetaClpForDate } from '@/lib/pricingData'
import { computePriceCLP, calculateShipping } from '@/lib/pricing'
import { createPayment } from '@/lib/flow/flowClient'
import { cookies } from 'next/headers'
import { getOrCreateUserCart } from '@/lib/cart'

const CheckoutRequestSchema = z.object({
  cartId: z.string().optional(),
  email: z.string().email().optional(), // For guest checkout
  items: z.array(z.object({
    printingId: z.string(),
    quantity: z.number().int().min(1),
  })).optional(),
})

/**
 * POST /api/checkout
 * Creates an order and Flow payment
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    let body: any = {}
    try {
      body = await req.json()
    } catch (parseError) {
      // Body might be empty for authenticated user checkout
      body = {}
    }
    
    const validated = CheckoutRequestSchema.safeParse(body)
    
    if (!validated.success) {
      console.error('[checkout] Validation error:', validated.error.issues)
      return NextResponse.json(
        { 
          error: 'invalid_request', 
          message: 'Invalid request parameters',
          details: validated.error.issues 
        },
        { status: 400 }
      )
    }

    const { cartId, items: bodyItems, email: bodyEmail } = validated.data

    // Get user (optional - supports guest checkout)
    const user = await getSessionUser()
    let email: string | undefined = bodyEmail

    // Determine cart source
    let cartItems: Array<{ printingId: string; quantity: number; unitPrice: number | null }> = []

    if (cartId) {
      // Use specified cart
      const cart = await prisma.cart.findFirst({
        where: { id: cartId, checkedOutAt: null },
        include: { items: true },
      })

      if (!cart) {
        return NextResponse.json({ error: 'cart_not_found' }, { status: 404 })
      }

      cartItems = cart.items.map((item) => ({
        printingId: item.printingId,
        quantity: item.quantity,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
      }))

      // Get email from user if authenticated
      if (user && cart.userId === user.id) {
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { email: true },
        })
        email = userRecord?.email || undefined
      }
    } else if (bodyItems && bodyItems.length > 0) {
      // Use items from request body
      cartItems = bodyItems.map((item) => ({
        printingId: item.printingId,
        quantity: item.quantity,
        unitPrice: null, // Will be computed from DB
      }))
    } else if (user) {
      // Use user's active cart
      const userCart = await getOrCreateUserCart(user.id)
      const cart = await prisma.cart.findFirst({
        where: { id: userCart.id, checkedOutAt: null },
        include: { items: true },
      })

      if (!cart || cart.items.length === 0) {
        return NextResponse.json({ error: 'cart_empty' }, { status: 400 })
      }

      cartItems = cart.items.map((item) => ({
        printingId: item.printingId,
        quantity: item.quantity,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
      }))

      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      })
      email = userRecord?.email || undefined
    } else {
      // Try guest cart from cookie
      const store = await cookies()
      const token = store.get('cart_token')?.value
      if (token) {
        const cart = await prisma.cart.findFirst({
          where: { token, checkedOutAt: null },
          include: { items: true },
        })

        if (cart && cart.items.length > 0) {
          cartItems = cart.items.map((item) => ({
            printingId: item.printingId,
            quantity: item.quantity,
            unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
          }))
        }
      }

      if (cartItems.length === 0) {
        return NextResponse.json({ error: 'cart_empty' }, { status: 400 })
      }
    }

    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'cart_empty' }, { status: 400 })
    }

    // Validate Flow configuration early (fail fast)
    try {
      const { getFlowConfig } = await import('@/lib/flow/flowClient')
      getFlowConfig()
    } catch (configError: any) {
      console.error('[checkout] Flow configuration error:', configError.message)
      let errorCode = 'configuration_error'
      let errorMessage = 'Payment system configuration error. Please contact support.'
      
      if (configError.message?.includes('FLOW_API_KEY')) {
        errorMessage = 'Payment system configuration error: FLOW_API_KEY is not set. Please contact support.'
      } else if (configError.message?.includes('FLOW_SECRET')) {
        errorMessage = 'Payment system configuration error: FLOW_SECRET is not set. Please contact support.'
      } else if (configError.message?.includes('FLOW_RETURN_URL')) {
        errorMessage = 'Payment system configuration error: FLOW_RETURN_URL is not set or invalid. Please contact support.'
      } else if (configError.message?.includes('FLOW_CALLBACK_URL')) {
        errorMessage = 'Payment system configuration error: FLOW_CALLBACK_URL is not set or invalid. Please contact support.'
      } else if (configError.message?.includes('Invalid URL format')) {
        errorMessage = 'Payment system configuration error: Flow URLs are invalid. Please contact support.'
      }
      
      return NextResponse.json(
        { error: errorCode, message: errorMessage },
        { status: 500 }
      )
    }

    // Get pricing configuration
    const pricingConfig = await getPricingConfig()
    const betaClp = await getBetaClpForDate()

    // Enrich cart items with card details and compute CLP prices
    const enriched = await Promise.all(
      cartItems.map(async (item) => {
        // Get card from database
        const card = await prisma.mtgCard.findUnique({
          where: { scryfallId: item.printingId },
          select: {
            name: true,
            priceUsd: true,
            priceUsdFoil: true,
            priceUsdEtched: true,
          },
        })

        if (!card) {
          throw new Error(`Card not found: ${item.printingId}`)
        }

        // Always compute CLP price from current USD prices (never trust stored unitPrice)
        // unitPrice in CartItem is stored in USD, but we need CLP for Flow payments
        const usdPrice = card.priceUsdEtched ?? card.priceUsdFoil ?? card.priceUsd
        if (!usdPrice) {
          throw new Error(`No price available for card: ${item.printingId}`)
        }

        const unitPriceCLP = computePriceCLP(Number(usdPrice), {
          tcgPriceUsd: Number(usdPrice),
          fxClp: pricingConfig.fxClp,
          alphaLow: pricingConfig.alphaLow,
          alphaMid: pricingConfig.alphaMid,
          alphaHigh: pricingConfig.alphaHigh,
          alphaTierLowUsd: pricingConfig.alphaTierLowUsd,
          alphaTierMidUsd: pricingConfig.alphaTierMidUsd,
          betaClp,
          priceMinPerCardClp: pricingConfig.priceMinPerCardClp,
          roundToStepClp: pricingConfig.roundToStepClp,
        })

        return {
          printingId: item.printingId,
          quantity: item.quantity,
          unitPriceCLP,
          lineTotalCLP: unitPriceCLP * item.quantity,
          cardName: card.name,
        }
      })
    )

    // Calculate totals
    const subtotalCLP = enriched.reduce((sum, item) => sum + item.lineTotalCLP, 0)
    const shippingCLP = calculateShipping(
      subtotalCLP,
      pricingConfig.shippingFlatClp,
      pricingConfig.freeShippingThresholdClp
    )
    const totalCLP = subtotalCLP + shippingCLP

    console.log('[checkout] Price calculation:', {
      enrichedItems: enriched.length,
      subtotalCLP,
      minOrderSubtotalClp: pricingConfig.minOrderSubtotalClp,
      meetsMinimum: subtotalCLP >= pricingConfig.minOrderSubtotalClp,
      itemDetails: enriched.map(item => ({
        printingId: item.printingId,
        quantity: item.quantity,
        unitPriceCLP: item.unitPriceCLP,
        lineTotalCLP: item.lineTotalCLP,
      })),
    })

    // Check minimum order
    if (subtotalCLP < pricingConfig.minOrderSubtotalClp) {
      console.error('[checkout] Minimum order not met:', {
        subtotalCLP,
        required: pricingConfig.minOrderSubtotalClp,
        difference: pricingConfig.minOrderSubtotalClp - subtotalCLP,
      })
      return NextResponse.json(
        {
          error: 'minimum_order_not_met',
          required: pricingConfig.minOrderSubtotalClp,
          current: subtotalCLP,
        },
        { status: 400 }
      )
    }

    // Create order and payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          userId: user?.id,
          email,
          totalAmount: subtotalCLP / 100, // Store in USD equivalent for compatibility
          amountCLP: totalCLP,
          status: 'pending',
          items: {
            create: enriched.map((item) => ({
              printingId: item.printingId,
              quantity: item.quantity,
              unitPrice: item.unitPriceCLP / 100, // Store in USD equivalent
            })),
          },
          metadata: {
            subtotalCLP,
            shippingCLP,
            totalCLP,
            items: enriched.map((item) => ({
              printingId: item.printingId,
              quantity: item.quantity,
              unitPriceCLP: item.unitPriceCLP,
              lineTotalCLP: item.lineTotalCLP,
              cardName: item.cardName,
            })),
          },
        },
        select: { id: true },
      })

      // Create Flow payment
      // Subject: Remove special characters and spaces that Flow doesn't like (per FAQ #53)
      // Replace spaces with hyphens and remove problematic characters
      const subject = `Order ${order.id} - ${enriched.length} items`
        .replace(/[&+"]/g, '')
        .replace(/\s+/g, ' ') // Normalize multiple spaces
        .trim()
      const paymentResponse = await createPayment({
        commerceOrder: order.id,
        subject,
        amount: totalCLP,
        currency: 'CLP',
        email,
        urlReturn: process.env.FLOW_RETURN_URL!,
        urlConfirmation: process.env.FLOW_CALLBACK_URL!,
      })

      // Update order with Flow token
      await tx.order.update({
        where: { id: order.id },
        data: {
          flowToken: paymentResponse.token,
        },
      })

      // Log payment creation
      await tx.paymentLog.create({
        data: {
          orderId: order.id,
          event: 'payment.created',
          payload: {
            token: paymentResponse.token,
            url: paymentResponse.url,
            amountCLP: totalCLP,
          },
        },
      })

      // Mark cart as checked out if we used a cart
      if (cartId) {
        await tx.cart.update({
          where: { id: cartId },
          data: { checkedOutAt: new Date() },
        })
      } else if (user) {
        const userCart = await tx.cart.findFirst({
          where: { userId: user.id, checkedOutAt: null },
        })
        if (userCart) {
          await tx.cart.update({
            where: { id: userCart.id },
            data: { checkedOutAt: new Date() },
          })
        }
      } else {
        // Guest cart
        const store = await cookies()
        const token = store.get('cart_token')?.value
        if (token) {
          const guestCart = await tx.cart.findFirst({
            where: { token, checkedOutAt: null },
          })
          if (guestCart) {
            await tx.cart.update({
              where: { id: guestCart.id },
              data: { checkedOutAt: new Date() },
            })
          }
        }
      }

      return {
        orderId: order.id,
        paymentUrl: paymentResponse.url,
        token: paymentResponse.token,
      }
    })

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      paymentUrl: result.paymentUrl,
    })
  } catch (error: any) {
    console.error('[checkout] Error:', error)
    console.error('[checkout] Error stack:', error.stack)

    // Check for specific error types
    let errorMessage = error.message || 'Failed to create checkout'
    let errorCode = 'checkout_failed'
    
    if (error.message?.includes('environment variable')) {
      errorCode = 'configuration_error'
      // Extract which variable is missing from the error message
      const missingVar = error.message.match(/FLOW_\w+/)?.[0] || 'Flow configuration'
      errorMessage = `Payment system configuration error: ${missingVar} is not set. Please contact support.`
    } else if (error.message?.includes('Invalid URL format')) {
      errorCode = 'configuration_error'
      // Extract which URL is invalid from the error message
      const invalidVar = error.message.match(/FLOW_\w+_URL/)?.[0] || 'Flow URL'
      errorMessage = `Payment system configuration error: ${invalidVar} is not a valid URL. Please contact support.`
    } else if (error.message?.includes('Flow API error')) {
      errorCode = 'payment_gateway_error'
      errorMessage = `Payment gateway error: ${error.message}`
    }

    // Log error to payment log if we have an order
    try {
      if (error.orderId) {
        await prisma.paymentLog.create({
          data: {
            orderId: error.orderId,
            event: 'payment.error',
            payload: {
              error: error.message,
              errorCode,
              stack: error.stack,
            },
          },
        })
      }
    } catch (logError) {
      console.error('[checkout] Failed to log error:', logError)
    }

    return NextResponse.json(
      {
        error: errorCode,
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

