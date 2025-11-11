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
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null
    let mounted = true
    let currentPollCount = 0
    const MAX_POLLS = 10 // Stop after 10 polls (30 seconds)

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
        currentPollCount++
        setPollCount(currentPollCount)

        // If payment is complete, stop polling and refresh to show success page
        if (newStatus === 'paid') {
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          // Refresh the page to show final status
          setTimeout(() => {
            router.refresh()
          }, 500)
        } else if (newStatus === 'failed' || newStatus === 'cancelled') {
          // If payment failed or was cancelled, redirect to cart immediately
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          // Redirect to cart so user can try again
          setTimeout(() => {
            router.push('/cart?payment=cancelled')
          }, 500)
        } else if (currentPollCount >= MAX_POLLS) {
          // If we've polled too many times and still pending, likely cancelled
          // Redirect to cart to avoid infinite polling
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          console.warn(`[OrderStatusClient] Max polls reached for order ${orderId}, redirecting to cart`)
          router.push('/cart?payment=timeout')
        }
      } catch (err: any) {
        if (!mounted) return
        setError(err.message || 'Failed to check status')
        currentPollCount++
        setPollCount(currentPollCount)
        // If we've had too many errors, redirect to cart
        if (currentPollCount >= MAX_POLLS) {
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          router.push('/cart?payment=error')
        }
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
      <div 
        className="mt-6 p-4 border rounded"
        style={{ 
          background: 'color-mix(in oklab, var(--warning) 15%, transparent)',
          borderColor: 'color-mix(in oklab, var(--warning) 30%, transparent)'
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text)' }}>
          Waiting for payment confirmation... This page will update automatically.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className="mt-6 p-4 border rounded"
        style={{ 
          background: 'color-mix(in oklab, var(--danger) 15%, transparent)',
          borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)'
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text)' }}>Error checking status: {error}</p>
      </div>
    )
  }

  return null
}

