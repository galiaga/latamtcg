import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getPricingConfig } from '@/lib/pricingData'
import { formatPriceServer } from '@/lib/pricing'
import { getSessionUser } from '@/lib/supabase'
import OrderStatusClient from './OrderStatusClient'
import PostPurchaseInvite from './PostPurchaseInvite'

// Disable Server Actions for this route (Flow redirects here, not a Server Action)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const token = String(params.token || params.Token || params.token_payment || '')
  const status = String(params.status || params.Status || '')

  // Get pricing configuration
  const config = await getPricingConfig()

  if (!token) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Payment Return</h1>
        <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded">
          <p className="text-yellow-800">Missing payment token. Please contact support if you completed a payment.</p>
        </div>
        <div className="mt-4">
          <Link href="/" className="btn">Go home</Link>
        </div>
      </div>
    )
  }

  // Find order by Flow token
  const order = await prisma.order.findUnique({
    where: { flowToken: token },
    select: {
      id: true,
      status: true,
      amountCLP: true,
      createdAt: true,
      paidAt: true,
      userId: true,
      email: true,
      items: {
        select: {
          printingId: true,
          quantity: true,
          unitPrice: true,
        },
      },
      metadata: true,
    },
  })

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Payment Return</h1>
        <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded">
          <p className="text-red-800">Order not found for this payment token. Please contact support.</p>
        </div>
        <div className="mt-4">
          <Link href="/" className="btn">Go home</Link>
        </div>
      </div>
    )
  }

  // Get order metadata for display
  const metadata = order.metadata as
    | {
        subtotalCLP?: number
        shippingCLP?: number
        totalCLP?: number
        items?: Array<{
          printingId: string
          quantity: number
          unitPriceCLP: number
          lineTotalCLP: number
          cardName: string
        }>
      }
    | null

  const totalCLP = order.amountCLP || metadata?.totalCLP || 0

  // Check if this is a guest order (no userId but has email)
  const isGuestOrder = !order.userId && !!order.email
  const user = await getSessionUser()
  const isLoggedIn = !!user
  const featureOn = process.env.NEXT_PUBLIC_FEATURE_GUEST_CHECKOUT_MODAL === 'true'

  // Render based on order status (source of truth from DB)
  if (order.status === 'paid') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold">Payment Successful!</h1>
          </div>
          <p className="text-gray-600">Thank you for your order. Your payment has been confirmed.</p>
        </div>

        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-600">Order ID</div>
              <div className="font-mono text-sm">{order.id.slice(0, 12)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Payment Date</div>
              <div className="text-sm">
                {order.paidAt?.toLocaleString('es-CL', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }) || order.createdAt.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          </div>

          {metadata?.items && metadata.items.length > 0 && (
            <div className="mb-4">
              <h2 className="font-semibold mb-2">Order Items</h2>
              <div className="space-y-2">
                {metadata.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.cardName} × {item.quantity}
                    </span>
                    <span className="tabular-nums">{formatPriceServer(item.lineTotalCLP, config)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metadata?.shippingCLP && metadata.shippingCLP > 0 && (
            <div className="mb-4 border-t pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPriceServer(metadata.subtotalCLP || 0, config)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Shipping</span>
                <span className="tabular-nums">{formatPriceServer(metadata.shippingCLP, config)}</span>
              </div>
            </div>
          )}

          <div className="border-t pt-4 flex justify-between font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatPriceServer(totalCLP, config)}</span>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="font-semibold text-blue-900 mb-2">What's Next?</h2>
          <p className="text-sm text-blue-800">
            We'll send you an email confirmation shortly. Your order will be processed and shipped as soon as possible.
          </p>
        </div>

        {/* Post-purchase invitation for guest orders */}
        {featureOn && isGuestOrder && !isLoggedIn && order.email && (
          <PostPurchaseInvite email={order.email} orderId={order.id} />
        )}

        <div className="mt-6 flex gap-4">
          {isLoggedIn ? (
            <Link href="/orders" className="btn">
              View All Orders
            </Link>
          ) : null}
          <Link href="/mtg" className={isLoggedIn ? "btn btn-ghost" : "btn"}>
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  if (order.status === 'failed' || order.status === 'cancelled') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold">Payment {order.status === 'failed' ? 'Failed' : 'Cancelled'}</h1>
          </div>
          <p className="text-gray-600">
            Your payment could not be processed. Please try again or contact support if the problem persists.
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-600">Order ID</div>
              <div className="font-mono text-sm">{order.id.slice(0, 12)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Date</div>
              <div className="text-sm">{order.createdAt.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            </div>
          </div>

          <div className="border-t pt-4 flex justify-between font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatPriceServer(totalCLP, config)}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Link href="/cart" className="btn">
            Try Again
          </Link>
          <Link href="/" className="btn btn-ghost">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  // Status is pending - show processing with polling
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-yellow-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">Processing Payment</h1>
        </div>
        <p className="text-gray-600">We're verifying your payment. This may take a few moments.</p>
      </div>

      <div className="border rounded-lg p-6 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-600">Order ID</div>
            <div className="font-mono text-sm">{order.id.slice(0, 12)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Date</div>
            <div className="text-sm">{order.createdAt.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          </div>
        </div>

        <div className="border-t pt-4 flex justify-between font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatPriceServer(totalCLP, config)}</span>
        </div>
      </div>

      {/* Client component that polls for order status */}
      <OrderStatusClient orderId={order.id} token={token} />

      <div className="mt-6 text-sm text-gray-600">
        <p>If this page doesn't update automatically, please refresh or contact support.</p>
      </div>
    </div>
  )
}

