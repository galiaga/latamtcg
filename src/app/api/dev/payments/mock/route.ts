export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/dev/payments/mock
 * Development endpoint to simulate Flow callback for local testing
 * Only available in non-production environments
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available_in_production' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { orderId, token, status = 2 } = body as {
      orderId?: string
      token?: string
      status?: number
    }

    if (!orderId && !token) {
      return NextResponse.json(
        { error: 'missing_order_id_or_token' },
        { status: 400 }
      )
    }

    // Import here to avoid loading in production
    const { prisma } = await import('@/lib/prisma')
    const { getPaymentStatus } = await import('@/lib/flow/flowClient')

    // Find order
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          orderId ? { id: orderId } : {},
          token ? { flowToken: token } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
      select: { id: true, flowToken: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 })
    }

    const flowToken = order.flowToken || token
    if (!flowToken) {
      return NextResponse.json({ error: 'missing_flow_token' }, { status: 400 })
    }

    // Simulate callback payload
    const mockPayload = {
      token: flowToken,
      status,
      flowOrder: `mock_${order.id}`,
      payer: {
        name: 'Test User',
        email: 'test@example.com',
      },
      paymentData: {
        amount: 10000, // Mock amount
        currency: 'CLP',
      },
    }

    // Call the actual callback handler logic
    // We'll simulate by calling Flow callback endpoint internally
    const callbackUrl = new URL('/api/flow/callback', req.url)
    const callbackResponse = await fetch(callbackUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: flowToken,
        status: String(status),
        flowOrder: mockPayload.flowOrder,
        s: 'mock_signature', // Will fail signature check but that's ok for dev
      }),
    })

    const callbackData = await callbackResponse.json()

    return NextResponse.json({
      ok: true,
      message: 'Mock callback sent',
      orderId: order.id,
      token: flowToken,
      status,
      callbackResult: callbackData,
    })
  } catch (error: any) {
    console.error('[dev/payments/mock] Error:', error)
    return NextResponse.json(
      {
        error: 'mock_failed',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dev/payments/mock
 * Show sample payload for testing
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available_in_production' }, { status: 403 })
  }

  return NextResponse.json({
    message: 'Use POST to simulate a Flow callback',
    example: {
      orderId: 'order_id_here',
      token: 'flow_token_here',
      status: 2, // 1 = pending, 2 = paid, 3 = rejected, 4 = expired
    },
    usage: `
      curl -X POST ${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/dev/payments/mock \\
        -H "Content-Type: application/json" \\
        -d '{"orderId": "your_order_id", "status": 2}'
    `,
  })
}

