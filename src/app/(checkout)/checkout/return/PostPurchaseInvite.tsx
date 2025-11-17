'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'

interface PostPurchaseInviteProps {
  email: string
  orderId: string
}

export default function PostPurchaseInvite({ email, orderId }: PostPurchaseInviteProps) {
  // Track when invite is shown
  useEffect(() => {
    track('guest_postpurchase_invite_shown', { orderId })
  }, [orderId])

  const handleClick = () => {
    track('guest_postpurchase_invite_click', { orderId })
  }

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <h3 className="font-semibold text-blue-900 mb-1">
        Create your account with one click
      </h3>
      <p className="text-sm text-blue-800 mb-3">
        Use the same email to save your data and track your orders.
      </p>
      <Link
        href={`/auth?email=${encodeURIComponent(email)}&fromOrder=${encodeURIComponent(orderId)}`}
        className="btn btn-gradient inline-block"
        onClick={handleClick}
      >
        Create account
      </Link>
    </div>
  )
}

