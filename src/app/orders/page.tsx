import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/supabase'
import { getPricingConfig, getDisplayPriceServer } from '@/lib/pricingData'
import { formatPriceServer } from '@/lib/pricing'

export default async function OrdersPage() {
  const user = await getSessionUser()
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Orders</h1>
        <p className="mt-4">Please sign in to view your orders.</p>
      </div>
    )
  }
  
  // Get pricing configuration
  const config = await getPricingConfig()
  
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { 
      id: true, 
      totalAmount: true, 
      status: true, 
      createdAt: true,
      items: {
        select: {
          printingId: true,
          quantity: true,
          unitPrice: true
        }
      }
    },
  })
  
  // Calculate CLP totals for each order
  const ordersWithClpTotals = await Promise.all(orders.map(async (order) => {
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
    
    return {
      ...order,
      clpTotal
    }
  }))
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Your Orders</h1>
      <ul className="mt-4 space-y-3">
        {ordersWithClpTotals.map(o => (
          <li key={o.id} className="border rounded p-3">
            <div className="flex justify-between">
              <span>#{o.id.slice(0,8)}</span>
              <span>{o.createdAt.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Status: {o.status}</span>
              <span>Total: {formatPriceServer(o.clpTotal, config)}</span>
            </div>
          </li>
        ))}
        {ordersWithClpTotals.length === 0 && <li>No orders yet.</li>}
      </ul>
    </div>
  )
}


