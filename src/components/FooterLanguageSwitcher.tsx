'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function FooterLanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === locale || isPending) return

    // Set the locale cookie
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    })

    // Refresh the page to apply the new locale
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-300">
      <button
        type="button"
        onClick={() => handleLanguageChange('es')}
        className={`hover:text-brand-300 transition-colors ${locale === 'es' ? 'font-semibold text-white' : ''}`}
        disabled={isPending}
      >
        ES
      </button>
      <span>/</span>
      <button
        type="button"
        onClick={() => handleLanguageChange('en')}
        className={`hover:text-brand-300 transition-colors ${locale === 'en' ? 'font-semibold text-white' : ''}`}
        disabled={isPending}
      >
        EN
      </button>
    </div>
  )
}

