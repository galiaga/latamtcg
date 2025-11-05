import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const adminToken = process.env.ADMIN_TOKEN

function verifyAdminToken(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === adminToken
}

/**
 * GET /api/admin/orders
 * Get all orders (admin only)
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          items: {
            include: {
              // We'll need to join with MtgCard for card names
            },
          },
          paymentLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5, // Get last 5 payment events
          },
        },
      }),
      prisma.order.count({ where }),
    ])

    // Enrich orders with card names from metadata or by fetching
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const metadata = order.metadata as any
        const itemsWithNames = order.items.map((item) => {
          // Try to get card name from metadata first
          const metaItem = metadata?.items?.find(
            (mi: any) => mi.printingId === item.printingId
          )
          return {
            ...item,
            cardName: metaItem?.cardName || 'Unknown Card',
          }
        })

        return {
          ...order,
          items: itemsWithNames,
        }
      })
    )

    return NextResponse.json({
      orders: enrichedOrders,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get admin orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

