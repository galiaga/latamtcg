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
import { formatDisplayName } from '@/lib/cardNames'
import { formatCardVariant } from '@/lib/cards/formatVariant'
import { calculateChilexpressShipping } from '@/lib/shipping/chilexpress'

const CheckoutRequestSchema = z.object({
  cartId: z.string().optional(),
  email: z.string().email().optional(), // For guest checkout
  items: z.array(z.object({
    printingId: z.string(),
    quantity: z.number().int().min(1),
  })).optional(),
  // Delivery method and shipping data
  deliveryMethod: z.enum(['pickup', 'courier']).optional(),
  // For courier delivery
  shippingRegion: z.string().optional(),
  shippingCommune: z.string().optional(),
  shippingAddressLine1: z.string().optional(),
  shippingAddressLine2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingPostalCode: z.string().optional(),
  shippingInstructions: z.string().optional(),
  // For pickup delivery
  pickupNotes: z.string().optional(),
  // Contact info (name, phone) - can be used for both methods
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  contactPhone: z.string().optional(),
}).superRefine((data, ctx) => {
  // If delivery method is pickup, firstName, lastName, and contactPhone are required
  if (data.deliveryMethod === 'pickup') {
    if (!data.firstName || data.firstName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'First name is required for pickup delivery.',
        path: ['firstName'],
      })
    }
    if (!data.lastName || data.lastName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Last name is required for pickup delivery.',
        path: ['lastName'],
      })
    }
    if (!data.contactPhone || data.contactPhone.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contact phone is required for pickup delivery.',
        path: ['contactPhone'],
      })
    }
  }
  // For courier, firstName and lastName are also required
  if (data.deliveryMethod === 'courier') {
    if (!data.firstName || data.firstName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'First name is required for courier delivery.',
        path: ['firstName'],
      })
    }
    if (!data.lastName || data.lastName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Last name is required for courier delivery.',
        path: ['lastName'],
      })
    }
  }
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

    const { 
      cartId, 
      items: bodyItems, 
      email: bodyEmail,
      deliveryMethod: bodyDeliveryMethod,
      shippingRegion,
      shippingCommune,
      shippingAddressLine1,
      shippingAddressLine2,
      shippingCity,
      shippingPostalCode,
      shippingInstructions,
      pickupNotes,
      firstName,
      lastName,
      contactPhone,
    } = validated.data

    // Get user (optional - supports guest checkout)
    const user = await getSessionUser()
    // Use email from request body, session user, or database (in that order)
    // Note: user.email can be null from Supabase, so we need to check explicitly
    let email: string | undefined = bodyEmail || (user?.email ? user.email : undefined)

    // Determine cart source
    let cartItems: Array<{ printingId: string; quantity: number; unitPrice: number | null; finish?: string }> = []

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
        finish: item.finish || 'normal',
      }))

      // Get email from user if authenticated (use session email first, then database)
      if (user && cart.userId === user.id) {
        if (!email && user.email) {
          email = user.email
        } else if (!email) {
          const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            select: { email: true },
          })
          email = userRecord?.email || undefined
        }
      }
    } else if (bodyItems && bodyItems.length > 0) {
      // Use items from request body
      cartItems = bodyItems.map((item) => ({
        printingId: item.printingId,
        quantity: item.quantity,
        unitPrice: null, // Will be computed from DB
        finish: 'normal', // Default to normal if not provided in body
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
        finish: item.finish || 'normal',
      }))

      // Use email from session user first, then database
      if (!email && user.email) {
        email = user.email
      } else if (!email) {
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { email: true },
        })
        email = userRecord?.email || undefined
      }
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
            finish: item.finish || 'normal',
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
        // Get card from database with full details for display name
        const card = await prisma.mtgCard.findUnique({
          where: { scryfallId: item.printingId },
          select: {
            name: true,
            flavorName: true,
            priceUsd: true,
            priceUsdFoil: true,
            priceUsdEtched: true,
            finishes: true,
            frameEffects: true,
            promoTypes: true,
            borderColor: true,
          },
        })

        if (!card) {
          throw new Error(`Card not found: ${item.printingId}`)
        }

        // Determine finish and price based on cart item finish
        const finish = (item.finish === 'foil' || item.finish === 'etched') ? item.finish : 'normal'
        const usdPrice = finish === 'etched' 
          ? (card.priceUsdEtched ?? card.priceUsdFoil ?? card.priceUsd)
          : finish === 'foil'
          ? (card.priceUsdFoil ?? card.priceUsd)
          : card.priceUsd

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

        // Format full display name with variant suffix
        const variant = formatCardVariant({
          finishes: card.finishes || [],
          promoTypes: card.promoTypes || [],
          frameEffects: card.frameEffects || [],
          borderColor: card.borderColor,
        })
        const displayName = formatDisplayName(card.name || '', card.flavorName) + variant.suffix

        // Format finish label
        const finishLabel = finish === 'etched' ? 'Etched' : finish === 'foil' ? 'Foil' : 'Normal'

        return {
          printingId: item.printingId,
          quantity: item.quantity,
          unitPriceCLP,
          lineTotalCLP: unitPriceCLP * item.quantity,
          cardName: card.name, // Keep for backward compatibility
          displayName, // Full display name with variant suffix
          finish, // 'normal', 'foil', or 'etched'
          finishLabel, // 'Normal', 'Foil', or 'Etched'
        }
      })
    )

    // Determine delivery method (default to courier for backward compatibility)
    const deliveryMethod = bodyDeliveryMethod || 'courier'
    
    // Calculate shipping cost based on delivery method
    let shippingCLP = 0
    let shippingCourier: string | null = null
    let shippingRegionValue: string | null = null
    
    if (deliveryMethod === 'courier') {
      // Validate required shipping fields for courier
      if (!shippingRegion || shippingRegion.trim() === '') {
        return NextResponse.json(
          {
            error: 'shipping_region_required',
            message: 'Shipping region is required for courier delivery.',
          },
          { status: 400 }
        )
      }
      
      if (!shippingCommune || shippingCommune.trim() === '') {
        return NextResponse.json(
          {
            error: 'shipping_commune_required',
            message: 'Shipping commune is required for courier delivery.',
          },
          { status: 400 }
        )
      }
      
      if (!shippingAddressLine1 || shippingAddressLine1.trim() === '') {
        return NextResponse.json(
          {
            error: 'shipping_address_required',
            message: 'Shipping address is required for courier delivery.',
          },
          { status: 400 }
        )
      }
      
      // Calculate Chilexpress shipping cost
      const quote = calculateChilexpressShipping({ region: shippingRegion })
      shippingCLP = quote.cost
      shippingCourier = quote.courier
      shippingRegionValue = shippingRegion
    } else {
      // Pickup: no shipping cost
      shippingCLP = 0
      shippingCourier = null
    }
    
    // Calculate totals
    const subtotalCLP = enriched.reduce((sum, item) => sum + item.lineTotalCLP, 0)
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

    // Validate email is present (required by Flow)
    if (!email || email.trim() === '') {
      console.error('[checkout] Email is required for Flow payment')
      return NextResponse.json(
        {
          error: 'email_required',
          message: 'Email is required to complete checkout. Please provide your email address.',
        },
        { status: 400 }
      )
    }

    // Find cart ID to store in order metadata (for later cart cleanup when payment is confirmed)
    let cartIdToStore: string | null = null
    if (cartId) {
      cartIdToStore = cartId
    } else if (user) {
      const userCart = await prisma.cart.findFirst({
        where: { userId: user.id, checkedOutAt: null },
        select: { id: true },
      })
      cartIdToStore = userCart?.id || null
    } else {
      // Guest cart
      const store = await cookies()
      const token = store.get('cart_token')?.value
      if (token) {
        const guestCart = await prisma.cart.findFirst({
          where: { token, checkedOutAt: null },
          select: { id: true },
        })
        cartIdToStore = guestCart?.id || null
      }
    }

    // Create order and payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create order with delivery data
      const order = await tx.order.create({
        data: {
          userId: user?.id,
          email,
          totalAmount: subtotalCLP / 100, // Store in USD equivalent for compatibility
          amountCLP: totalCLP,
          status: 'pending',
          deliveryMethod,
          deliveryStatus: 'pending',
          shippingCourier,
          shippingCost: shippingCLP,
          shippingRegion: shippingRegionValue,
          shippingAddressLine1: deliveryMethod === 'courier' ? shippingAddressLine1 || null : null,
          shippingAddressLine2: deliveryMethod === 'courier' ? shippingAddressLine2 || null : null,
          shippingCity: deliveryMethod === 'courier' ? shippingCity || null : null,
          shippingCommune: deliveryMethod === 'courier' ? shippingCommune || null : null,
          shippingPostalCode: deliveryMethod === 'courier' ? shippingPostalCode || null : null,
          shippingInstructions: deliveryMethod === 'courier' ? shippingInstructions || null : null,
          pickupNotes: deliveryMethod === 'pickup' ? pickupNotes || null : null,
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
            cartId: cartIdToStore, // Store cartId for later cleanup when payment is confirmed
            deliveryMethod,
            firstName: firstName || null,
            lastName: lastName || null,
            contactPhone: contactPhone || null,
            items: enriched.map((item) => ({
              printingId: item.printingId,
              quantity: item.quantity,
              unitPriceCLP: item.unitPriceCLP,
              lineTotalCLP: item.lineTotalCLP,
              cardName: item.cardName, // Keep for backward compatibility
              displayName: item.displayName, // Full display name with variant suffix
              finish: item.finish, // 'normal', 'foil', or 'etched'
              finishLabel: item.finishLabel, // 'Normal', 'Foil', or 'Etched'
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

      // NOTE: Cart is NOT marked as checked out here.
      // Cart will only be marked as checked out when payment is confirmed (status = 'paid')
      // This ensures cart items remain available if payment fails or user cancels.

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

