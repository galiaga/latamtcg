import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/supabase'

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
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, totalAmount: true, status: true, createdAt: true },
  })
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Your Orders</h1>
      <ul className="mt-4 space-y-3">
        {orders.map(o => (
          <li key={o.id} className="border rounded p-3">
            <div className="flex justify-between">
              <span>#{o.id.slice(0,8)}</span>
              <span>{o.createdAt.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Status: {o.status}</span>
              <span>Total: ${String(o.totalAmount ?? 0)}</span>
            </div>
          </li>
        ))}
        {orders.length === 0 && <li>No orders yet.</li>}
      </ul>
      <div className="mt-6">
        <Link href="/">Continue shopping</Link>
      </div>
    </div>
  )
}


