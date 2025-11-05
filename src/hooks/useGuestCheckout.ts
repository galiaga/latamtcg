'use client'

import { useCallback, useState } from 'react'
import { track } from '@/lib/analytics'

export interface UseGuestCheckoutOptions {
  onEmailCollected: (email: string) => Promise<void>
}

export function useGuestCheckout(opts: UseGuestCheckoutOptions) {
  const [isModalOpen, setOpen] = useState(false)
  const featureOn = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FEATURE_GUEST_CHECKOUT_MODAL === 'true'

  const startGuestCheckout = useCallback(async () => {
    try {
      if (!featureOn) {
        // Fallback to existing native prompt path
        const email = window.prompt('Enter your email to checkout as guest') || ''
        if (email) {
          await opts.onEmailCollected(email)
        }
        return
      }
      
      // Open modal when feature is enabled
      track('guest_modal_shown')
      setOpen(true)
    } catch (error) {
      // Fallback to native prompt on any error
      console.error('[useGuestCheckout] Error:', error)
      const email = window.prompt('Enter your email to checkout as guest') || ''
      if (email) {
        await opts.onEmailCollected(email)
      }
    }
  }, [featureOn, opts])

  const closeModal = useCallback(() => {
    track('guest_modal_cancel')
    setOpen(false)
  }, [])

  const submit = useCallback(async (email: string) => {
    try {
      // Store email in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('latamtcg_guest_email', email)
      }

      // Extract email domain for analytics
      const emailDomain = email.split('@')[1] || 'unknown'
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      
      track('guest_modal_submit', { email_domain: emailDomain, valid: isValid })
      
      // Call existing happy path
      await opts.onEmailCollected(email)
      setOpen(false)
    } catch (error) {
      console.error('[useGuestCheckout] Submit error:', error)
      // Don't close modal on error, let user retry
      throw error
    }
  }, [opts])

  return {
    isModalOpen,
    startGuestCheckout,
    closeModal,
    submit,
  }
}

