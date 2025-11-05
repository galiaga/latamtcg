'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { track } from '@/lib/analytics'

interface GuestCheckoutModalProps {
  isOpen: boolean
  initialEmail?: string
  onCancel: () => void
  onContinue: (email: string) => Promise<void>
  onCreateAccount?: (email: string) => void
}

type FormData = {
  email: string
}

// Basic RFC-like email validation pattern
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function GuestCheckoutModal({
  isOpen,
  initialEmail = '',
  onCancel,
  onContinue,
  onCreateAccount,
}: GuestCheckoutModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      email: initialEmail,
    },
  })

  const modalRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLInputElement>(null)
  const lastFocusableRef = useRef<HTMLButtonElement>(null)

  // Combine RHF ref with our ref
  const emailRegister = register('email', {
    required: 'Enter a valid email',
    pattern: {
      value: EMAIL_PATTERN,
      message: 'Enter a valid email',
    },
  })
  
  const setEmailRef = useCallback((e: HTMLInputElement | null) => {
    emailRegister.ref(e)
    firstFocusableRef.current = e
  }, [emailRegister])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({ email: initialEmail })
      // Focus email input after a short delay to ensure modal is rendered
      setTimeout(() => {
        firstFocusableRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialEmail, reset])

  // Focus trap: handle Tab key
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
        return
      }

      if (e.key !== 'Tab') return

      const focusableElements = modalRef.current?.querySelectorAll(
        'input, button, [href], [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      await onContinue(data.email.trim().toLowerCase())
    } catch (error) {
      // Error is handled by parent, don't close modal
      console.error('[GuestCheckoutModal] Error:', error)
    }
  }

  // Handle Enter key on input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(onSubmit)()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-checkout-title"
      aria-describedby="guest-checkout-description"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal card */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <h2 id="guest-checkout-title" className="text-xl font-semibold mb-2">
            Checkout as guest
          </h2>
          <p id="guest-checkout-description" className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Enter your email to receive order summary and tracking.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email input */}
            <div>
              <label htmlFor="guest-email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="guest-email"
                type="email"
                autoComplete="email"
                {...emailRegister}
                ref={setEmailRef}
                onKeyPress={handleKeyPress}
                className="input w-full"
                placeholder="tu@ejemplo.com"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Reassurance row */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Payment protected by Flow</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Shipping throughout Chile</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-gradient flex-1"
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Continue as guest'}
              </button>
              {onCreateAccount && (
                <button
                  type="button"
                  onClick={() => {
                    const emailValue = firstFocusableRef.current?.value
                    if (emailValue) {
                      track('guest_modal_create_account_click')
                      onCreateAccount(emailValue.trim().toLowerCase())
                    }
                  }}
                  className="btn btn-ghost flex-1"
                  disabled={isSubmitting}
                >
                  Create account
                </button>
              )}
            </div>

            {/* Cancel link */}
            <div className="text-center">
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                disabled={isSubmitting}
                ref={lastFocusableRef}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

