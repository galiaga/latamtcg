'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const languages = [
    { code: 'es', label: 'Español', flag: '🇨🇱' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ]

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]

  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false)
      return
    }

    // Set the locale cookie
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    })

    setIsOpen(false)
    
    // Refresh the page to apply the new locale
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn flex items-center gap-2"
        aria-label={t('common.language')}
        aria-expanded={isOpen}
        disabled={isPending}
      >
        <span>{currentLanguage.flag}</span>
        <span className="hidden md:inline">{currentLanguage.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown menu */}
          <div
            className="absolute right-0 mt-2 w-48 rounded-xl border z-50 pointer-events-auto"
            style={{
              background: 'var(--card)',
              color: 'var(--text)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow)'
            }}
            role="menu"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 flex items-center gap-2 ${
                  lang.code === locale ? 'font-semibold' : ''
                }`}
                style={{
                  borderBottom: lang.code !== languages[languages.length - 1].code 
                    ? '1px solid var(--divider)' 
                    : 'none'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 
                    'color-mix(in oklab, var(--chip-hover) 40%, transparent)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
                role="menuitem"
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
                {lang.code === locale && (
                  <span className="ml-auto text-xs" style={{ color: 'var(--mutedText)' }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

