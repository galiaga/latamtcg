'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RandomButton() {
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
      alert('Unable to load a random item. Please try again.')
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
      {loading ? 'Loading...' : '🎲 Random Card'}
    </button>
  )
}

