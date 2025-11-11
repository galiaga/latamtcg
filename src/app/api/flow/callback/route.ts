export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseFlowCallback, verifyFlowSignature, getPaymentStatus } from '@/lib/flow/flowClient'
import { sendOrderConfirmationEmail } from '@/lib/email'

/**
 * POST /api/flow/callback
 * Flow webhook handler for payment status updates
 */
export async function POST(req: NextRequest) {
  try {
    // Parse callback payload
    const params = await parseFlowCallback(req)

    // Extract token (required for status check)
    const token = params.token || params.Token || params.token_payment
    if (!token) {
      console.error('[flow/callback] Missing token in payload:', params)
      // Return 200 to avoid retries, but log the error
      return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 200 })
    }

    // Verify signature if provided
    const signature = params.s || params.signature || req.headers.get('x-flow-signature')
    if (signature) {
      const isValid = verifyFlowSignature(params, signature)
      if (!isValid) {
        console.error('[flow/callback] Invalid signature for token:', token)
        // Return 200 to avoid retries, but log the error
        return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 200 })
      }
    } else {
      console.warn('[flow/callback] No signature provided for token:', token)
    }

    // Find order by token
    const order = await prisma.order.findUnique({
      where: { flowToken: token },
      include: { items: true },
    })

    if (!order) {
      console.error('[flow/callback] Order not found for token:', token)
      // Return 200 to avoid retries
      return NextResponse.json({ ok: false, error: 'order_not_found' }, { status: 200 })
    }

    // Check idempotency: if already paid or failed, don't process again
    if (order.status === 'paid' || order.status === 'failed' || order.status === 'cancelled') {
      console.log(`[flow/callback] Order ${order.id} already in final state: ${order.status}`)
      return NextResponse.json({ ok: true, status: order.status, message: 'already_processed' }, { status: 200 })
    }

    // Get payment status from Flow
    let paymentStatus
    try {
      paymentStatus = await getPaymentStatus(token)
    } catch (error: any) {
      console.error('[flow/callback] Failed to get payment status:', error)
      // Log error but still return 200
      await prisma.paymentLog.create({
        data: {
          orderId: order.id,
          event: 'payment.status_check_failed',
          payload: {
            token,
            error: error.message,
            params,
          },
        },
      })
      return NextResponse.json({ ok: false, error: 'status_check_failed' }, { status: 200 })
    }

    // Log the callback
    await prisma.paymentLog.create({
      data: {
        orderId: order.id,
        event: 'payment.callback_received',
        payload: {
          token,
          flowStatus: paymentStatus.status,
          flowOrder: paymentStatus.flowOrder,
          params,
        },
      },
    })

    // Process payment status
    // Flow status codes: 1 = pending, 2 = paid, 3 = rejected, 4 = expired
    const statusCode = paymentStatus.status || 0

    if (statusCode === 2) {
      // Payment is paid/authorized
      // Verify amount matches (security check)
      const flowAmount = paymentStatus.paymentData?.amount
      if (flowAmount && order.amountCLP) {
        const amountDiff = Math.abs(flowAmount - order.amountCLP)
        if (amountDiff > 1) {
          // Allow 1 CLP difference for rounding
          console.error(
            `[flow/callback] Amount mismatch for order ${order.id}: expected ${order.amountCLP}, got ${flowAmount}`
          )
          await prisma.paymentLog.create({
            data: {
              orderId: order.id,
              event: 'payment.amount_mismatch',
              payload: {
                expected: order.amountCLP,
                received: flowAmount,
                diff: amountDiff,
              },
            },
          })
          // Still update to paid but log the discrepancy
        }
      }

      // Update order to paid
      // Convert flowOrder to string (Prisma expects String type)
      const flowPaymentIdStr = paymentStatus.flowOrder 
        ? String(paymentStatus.flowOrder) 
        : token
      const flowOrderStr = paymentStatus.flowOrder 
        ? String(paymentStatus.flowOrder) 
        : undefined
      
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          flowPaymentId: flowPaymentIdStr,
          flowOrder: flowOrderStr,
        },
      })

      // Mark cart as checked out now that payment is confirmed
      // Cart items are only removed when payment is 100% complete
      try {
        const orderWithMetadata = await prisma.order.findUnique({
          where: { id: order.id },
          select: { metadata: true },
        })
        const metadata = orderWithMetadata?.metadata as any
        const cartId = metadata?.cartId
        if (cartId) {
          await prisma.cart.update({
            where: { id: cartId },
            data: { checkedOutAt: new Date() },
          })
          console.log(`[flow/callback] Cart ${cartId} marked as checked out for order ${order.id}`)
        }
      } catch (cartError) {
        // Don't fail the payment confirmation if cart update fails
        console.error(`[flow/callback] Failed to mark cart as checked out for order ${order.id}:`, cartError)
      }

      // Log payment completion
      await prisma.paymentLog.create({
        data: {
          orderId: order.id,
          event: 'payment.paid',
          payload: {
            token,
            flowOrder: paymentStatus.flowOrder,
            amount: paymentStatus.paymentData?.amount,
            payer: paymentStatus.payer,
          },
        },
      })

      // Send order confirmation email
      try {
        // Fetch order details for email
        const orderDetails = await prisma.order.findUnique({
          where: { id: order.id },
          select: {
            email: true,
            createdAt: true,
            amountCLP: true,
            metadata: true,
          },
        })

        if (orderDetails?.email) {
          const metadata = orderDetails.metadata as any
          const items = metadata?.items || []
          const subtotalCLP = metadata?.subtotalCLP || orderDetails.amountCLP || 0
          const shippingCLP = metadata?.shippingCLP || 0
          const taxesCLP = metadata?.taxesCLP
          const totalCLP = metadata?.totalCLP || orderDetails.amountCLP || 0

          // Construct order URL
          const baseUrl = process.env.APP_BASE_URL || req.nextUrl.origin
          const orderUrl = `${baseUrl}/order/confirmation?orderId=${order.id}`

          await sendOrderConfirmationEmail({
            to: orderDetails.email,
            orderId: order.id,
            orderDate: orderDetails.createdAt,
            items: items.map((item: any) => ({
              cardName: item.cardName || 'Unknown Card', // Keep for backward compatibility
              displayName: item.displayName || item.cardName || 'Unknown Card',
              quantity: item.quantity || 1,
              lineTotalCLP: item.lineTotalCLP || 0,
              finishLabel: item.finishLabel,
            })),
            subtotalCLP,
            shippingCLP,
            taxesCLP,
            totalCLP,
            orderUrl,
            supportEmail: 'hola@latamtcg.com',
            // locale is optional - defaults to 'en' via resolveLocale
          })
          console.log(`[flow/callback] Order confirmation email sent to ${orderDetails.email}`)
        } else {
          console.log(`[flow/callback] No email address for order ${order.id}, skipping email`)
        }
      } catch (emailError) {
        // Don't fail the callback if email fails
        console.error(`[flow/callback] Failed to send order confirmation email:`, emailError)
      }

      // TODO: Trigger other post-payment hooks
      // - Reserve inventory
      // - Decrement stock
      console.log(`[flow/callback] Order ${order.id} marked as paid`)

      return NextResponse.json({ ok: true, status: 'paid' }, { status: 200 })
    } else if (statusCode === 3 || statusCode === 4) {
      // Payment failed/rejected/expired
      const statusName = statusCode === 3 ? 'failed' : 'cancelled'

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: statusName,
        },
      })

      await prisma.paymentLog.create({
        data: {
          orderId: order.id,
          event: `payment.${statusName}`,
          payload: {
            token,
            flowStatus: statusCode,
            flowOrder: paymentStatus.flowOrder,
          },
        },
      })

      console.log(`[flow/callback] Order ${order.id} marked as ${statusName}`)

      return NextResponse.json({ ok: true, status: statusName }, { status: 200 })
    } else {
      // Status is pending (1) or unknown (0)
      // Don't update order, just log
      await prisma.paymentLog.create({
        data: {
          orderId: order.id,
          event: 'payment.pending',
          payload: {
            token,
            flowStatus: statusCode,
            flowOrder: paymentStatus.flowOrder,
          },
        },
      })

      return NextResponse.json({ ok: true, status: 'pending' }, { status: 200 })
    }
  } catch (error: any) {
    console.error('[flow/callback] Unexpected error:', error)

    // Try to log the error
    try {
      const params = await parseFlowCallback(req).catch(() => ({} as Record<string, string>))
      const token = params.token || params.Token || params.token_payment
      if (token) {
        const order = await prisma.order.findUnique({
          where: { flowToken: token },
          select: { id: true },
        })
        if (order) {
          await prisma.paymentLog.create({
            data: {
              orderId: order.id,
              event: 'payment.callback_error',
              payload: {
                error: error.message,
                stack: error.stack,
              },
            },
          })
        }
      }
    } catch (logError) {
      console.error('[flow/callback] Failed to log error:', logError)
    }

    // Always return 200 to avoid retries
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 200 })
  }
}

