'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface OrderStatusClientProps {
  orderId: string
  token: string
}

export default function OrderStatusClient({ orderId, token }: OrderStatusClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState<string>('pending')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null
    let mounted = true

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch order status')
        }

        const data = await response.json()
        if (!mounted) return

        const newStatus = data.status || 'pending'
        setStatus(newStatus)

        // If payment is complete or failed, stop polling and refresh
        if (newStatus === 'paid' || newStatus === 'failed' || newStatus === 'cancelled') {
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          // Refresh the page to show final status
          setTimeout(() => {
            router.refresh()
          }, 500)
        }
      } catch (err: any) {
        if (!mounted) return
        setError(err.message || 'Failed to check status')
        // Continue polling on error (might be transient)
      }
    }

    // Poll immediately, then every 3 seconds
    pollStatus()
    pollInterval = setInterval(pollStatus, 3000)

    // Cleanup on unmount
    return () => {
      mounted = false
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [orderId, router])

  if (status === 'pending') {
    return (
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          Waiting for payment confirmation... This page will update automatically.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-sm text-red-800">Error checking status: {error}</p>
      </div>
    )
  }

  return null
}

