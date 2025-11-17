'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function RandomButton() {
  const t = useTranslations()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRandomClick() {
    try {
      setLoading(true)
      const response = await fetch('/api/random-item')
      if (!response.ok) {
        throw new Error('Failed to fetch random item')
      }
      const data = await response.json()
      if (data.printingId) {
        router.push(`/mtg/printing/${data.printingId}`)
      }
    } catch (error) {
      console.error('Error fetching random item:', error)
      alert(t('errors.unableToLoadRandom'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRandomClick}
      disabled={loading}
      className="btn"
      style={{
        marginTop: '1rem',
      }}
      aria-label="Go to random card"
    >
      {loading ? t('common.loading') : t('home.randomCard')}
    </button>
  )
}

