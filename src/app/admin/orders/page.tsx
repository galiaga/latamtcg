'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCLP } from '@/lib/format'

interface OrderItem {
  id: string
  printingId: string
  quantity: number
  unitPrice: number | null
  cardName: string
}

interface PaymentLog {
  id: string
  event: string
  payload: any
  createdAt: string
}

interface Order {
  id: string
  userId: string | null
  email: string | null
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  amountCLP: number | null
  totalAmount: number | null
  createdAt: string
  paidAt: string | null
  flowToken: string | null
  flowOrder: string | null
  flowPaymentId: string | null
  user: {
    id: string
    email: string | null
  } | null
  items: OrderItem[]
  paymentLogs: PaymentLog[]
  metadata: any
}

export default function AdminOrdersPage() {
  const [token, setToken] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)

  const authenticate = async () => {
    if (token.trim()) {
      setAuthenticated(true)
    }
  }

  const loadOrders = useCallback(async () => {
    if (!token.trim()) {
      setError('No admin token provided')
      return
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    }

    setLoading(true)
    setError(null)
    try {
      const url = `/api/admin/orders?status=${statusFilter}`
      const res = await fetch(url, { headers })

      if (!res.ok) {
        throw new Error('Failed to load orders')
      }

      const data = await res.json()
      setOrders(data.orders || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter])

  useEffect(() => {
    if (authenticated && token.trim()) {
      loadOrders()
    }
  }, [authenticated, token, statusFilter, loadOrders])

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 border rounded">
        <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Admin Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter admin token"
            />
          </div>
          <button
            onClick={authenticate}
            className="w-full btn btn-primary"
            disabled={!token.trim()}
          >
            Authenticate
          </button>
        </div>
      </div>
    )
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin - Orders</h1>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      <div className="mb-4 text-sm text-gray-600">
        Total orders: {total} | Showing: {orders.length}
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {loading ? 'Loading orders...' : 'No orders found'}
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="border rounded-lg p-6 bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-semibold text-lg">
                    Order #{order.id.slice(0, 12)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Created: {new Date(order.createdAt).toLocaleString()}
                    {order.paidAt && (
                      <span className="ml-4">
                        Paid: {new Date(order.paidAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                      order.status
                    )}`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Customer</div>
                  <div className="font-medium">
                    {order.user?.email || order.email || 'Guest'}
                  </div>
                  {order.userId && (
                    <div className="text-xs text-gray-500">ID: {order.userId.slice(0, 8)}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-600">Amount</div>
                  <div className="font-semibold text-lg">
                    {order.amountCLP
                      ? formatCLP(order.amountCLP)
                      : order.totalAmount
                      ? `$${order.totalAmount}`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {order.flowToken && (
                <div className="mb-4 text-xs text-gray-500 space-y-1">
                  <div>Flow Token: {order.flowToken.slice(0, 20)}...</div>
                  {order.flowOrder && (
                    <div>Flow Order: {order.flowOrder}</div>
                  )}
                  {order.flowPaymentId && (
                    <div>Flow Payment ID: {order.flowPaymentId}</div>
                  )}
                </div>
              )}

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Items ({order.items.length})</div>
                <div className="space-y-1">
                  {order.items.map((item, idx) => {
                    // Get CLP price from metadata if available
                    const metaItem = order.metadata?.items?.[idx]
                    const lineTotalCLP = metaItem?.lineTotalCLP || null
                    
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm p-2 bg-gray-50 rounded"
                      >
                        <span>
                          {item.cardName} × {item.quantity}
                        </span>
                        <span className="tabular-nums">
                          {lineTotalCLP
                            ? formatCLP(lineTotalCLP)
                            : 'N/A'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {order.paymentLogs.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-2">
                    Payment Events ({order.paymentLogs.length})
                  </div>
                  <div className="space-y-1 text-xs">
                    {order.paymentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="font-medium">{log.event}</span>
                        <span className="text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

