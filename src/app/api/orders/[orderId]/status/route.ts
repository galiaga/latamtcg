export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/supabase'

/**
 * GET /api/orders/[orderId]/status
 * Get order status for polling
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params

    // Find order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        userId: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 })
    }

    // Optional: verify user owns the order (for security)
    const user = await getSessionUser()
    if (user && order.userId && order.userId !== user.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
    })
  } catch (error: any) {
    console.error('[orders/status] Error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

