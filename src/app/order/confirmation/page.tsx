import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/supabase'
import { getPricingConfig, getDisplayPriceServer } from '@/lib/pricingData'
import { formatPriceServer } from '@/lib/pricing'

export default async function OrderConfirmationPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const orderId = String(params.orderId || '')
  if (!orderId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Order</h1>
        <p className="mt-4">Missing order ID.</p>
        <div className="mt-4"><Link href="/">Go home</Link></div>
      </div>
    )
  }

  const order = await prisma.order.findUnique({ 
    where: { id: orderId }, 
    select: { 
      id: true, 
      totalAmount: true, 
      createdAt: true, 
      userId: true,
      items: {
        select: {
          printingId: true,
          quantity: true,
          unitPrice: true
        }
      }
    } 
  })
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Order</h1>
        <p className="mt-4">Order not found.</p>
        <div className="mt-4"><Link href="/">Go home</Link></div>
      </div>
    )
  }

  // Get pricing configuration
  const config = await getPricingConfig()

  // Calculate CLP total for the order
  let clpTotal = 0
  for (const item of order.items) {
    // Get the card details to determine which price to use
    const card = await prisma.mtgCard.findUnique({
      where: { scryfallId: item.printingId },
      select: { priceUsd: true, priceUsdFoil: true, priceUsdEtched: true }
    })
    
    if (card) {
      const cardPrice = {
        priceUsd: card.priceUsd,
        priceUsdFoil: card.priceUsdFoil,
        priceUsdEtched: card.priceUsdEtched
      }
      
      const displayPrice = getDisplayPriceServer(cardPrice, config)
      if (displayPrice) {
        clpTotal += displayPrice * item.quantity
      }
    }
  }

  const user = await getSessionUser()
  const isLoggedIn = !!user

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Thank you!</h1>
      <div className="mt-4 border rounded p-4">
        <div className="flex justify-between">
          <span>Order ID</span>
          <span className="font-mono">{order.id.slice(0, 10)}</span>
        </div>
        <div className="flex justify-between mt-2">
          <span>Date</span>
          <span>{order.createdAt.toLocaleString()}</span>
        </div>
        <div className="flex justify-between mt-2">
          <span>Total</span>
          <span className="tabular-nums">{formatPriceServer(clpTotal, config)}</span>
        </div>
      </div>

      {!isLoggedIn && (
        <div className="mt-6 p-4 rounded border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="font-medium">Create my account</div>
          <p className="text-sm mt-1" style={{ color: 'var(--mutedText)' }}>
            Create an account to track your orders and get updates. We’ll send you a magic link.
          </p>
          <div className="mt-3">
            <Link href="/auth" className="btn btn-gradient">Create my account</Link>
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link href="/mtg">Continue shopping</Link>
      </div>
    </div>
  )
}


