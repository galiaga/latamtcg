'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

// Dynamically import PhoneInput to avoid SSR issues
const PhoneInput = dynamic(
  () => import('react-phone-number-input'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full px-3 py-2 border rounded" style={{ borderColor: 'var(--border)', minHeight: '42px' }}>
        <span style={{ color: 'var(--mutedText)' }}>Loading...</span>
      </div>
    )
  }
)

export interface PhoneNumberFieldProps {
  value?: string
  onChange: (value: string | undefined) => void
  label: string
  required?: boolean
  error?: string
  name?: string
}

export default function PhoneNumberField({
  value,
  onChange,
  label,
  required = false,
  error,
  name = 'phone',
}: PhoneNumberFieldProps) {
  const t = useTranslations()
  const [mounted, setMounted] = useState(false)

  // Handle SSR - only render after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Validate phone number
  const validatePhone = (phoneValue: string | undefined): string | undefined => {
    if (required && !phoneValue) {
      return t('checkout.delivery.contact.phoneRequired')
    }
    
    if (phoneValue) {
      // For Chile, enforce exactly 9 digits after +56
      if (phoneValue.startsWith('+56')) {
        const digitsAfterCode = phoneValue.replace('+56', '')
        if (digitsAfterCode.length !== 9) {
          return t('checkout.delivery.contact.phoneInvalidChile')
        }
        // Check if all characters are digits
        if (!/^\d{9}$/.test(digitsAfterCode)) {
          return t('checkout.delivery.contact.phoneInvalidChile')
        }
        // If it's a valid Chilean number, return undefined (valid)
        return undefined
      }
      
      // Use library validation for other countries
      try {
        if (!isValidPhoneNumber(phoneValue)) {
          return t('checkout.delivery.contact.phoneInvalid')
        }
      } catch (e) {
        // Library validation failed, return generic error
        return t('checkout.delivery.contact.phoneInvalid')
      }
    }
    
    return undefined
  }

  const handleChange = (phoneValue: string | undefined) => {
    onChange(phoneValue)
  }

  if (!mounted) {
    // SSR fallback
    return (
      <div>
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-3 py-2 border rounded" style={{ borderColor: 'var(--border)', minHeight: '42px' }}>
          <span style={{ color: 'var(--mutedText)' }}>Loading...</span>
        </div>
      </div>
    )
  }

  const validationError = validatePhone(value)
  const displayError = error || validationError

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="phone-input-wrapper">
        <PhoneInput
          international
          defaultCountry="CL"
          value={value}
          onChange={handleChange}
          className="phone-input"
          numberInputProps={{
            className: 'phone-input-number',
            name: name,
          }}
          style={{
            '--PhoneInputCountryFlag-height': '1.2em',
            '--PhoneInputCountryFlag-width': '1.5em',
          } as React.CSSProperties}
        />
        <style jsx global>{`
          .phone-input-wrapper {
            width: 100%;
          }
          
          .phone-input {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .phone-input .PhoneInputInput {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 1rem;
            background-color: var(--surface);
            color: var(--text);
            outline: none;
            transition: border-color 0.2s;
            width: 100%;
          }
          
          .phone-input .PhoneInputInput:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 25%, transparent);
            outline: none;
          }
          
          .phone-input .PhoneInputInput::placeholder {
            color: var(--mutedText);
            opacity: 0.7;
          }
          
          .phone-input .PhoneInputCountry {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 8px 8px 0;
            flex-shrink: 0;
          }
          
          .phone-input .PhoneInputCountryIcon {
            width: 1.5em;
            height: 1.2em;
            border-radius: 2px;
            box-shadow: 0 0 0 1px var(--border);
          }
          
          .phone-input .PhoneInputCountrySelect {
            padding: 4px 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            background-color: var(--surface);
            color: var(--text);
            font-size: 0.875rem;
            cursor: pointer;
            outline: none;
            transition: border-color 0.2s;
          }
          
          .phone-input .PhoneInputCountrySelect:hover {
            background-color: var(--surface-2);
          }
          
          .phone-input .PhoneInputCountrySelect:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 25%, transparent);
            outline: none;
          }
          
          .phone-input .PhoneInputCountrySelectArrow {
            opacity: 0.5;
            margin-left: 4px;
          }
        `}</style>
      </div>
      {displayError && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
    </div>
  )
}

