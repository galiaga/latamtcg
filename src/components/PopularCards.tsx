'use client'

import { useState, useEffect } from 'react'
import CardTile from './CardTile'

interface PopularCard {
  id: string
  name: string
  setCode: string
  setName: string
  collectorNumber: string
  priceUsd: number | null
  priceUsdFoil: number | null
  priceUsdEtched: number | null
  rarity: string
  cartCount: number
}

interface PopularCardsResponse {
  cards: PopularCard[]
  total: number
}

export default function PopularCards() {
  const [cards, setCards] = useState<PopularCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPopularCards() {
      try {
        const response = await fetch('/api/popular-cards')
        if (!response.ok) {
          throw new Error('Failed to fetch popular cards')
        }
        const data: PopularCardsResponse = await response.json()
        setCards(data.cards)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPopularCards()
  }, [])

  if (loading) {
    return (
      <section className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-semibold">Popular Right Now</h2>
            <span className="text-xl animate-pulse">🔥</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[63/88] bg-gray-200 rounded-lg mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-semibold">Popular Right Now</h2>
            <span className="text-xl">🔥</span>
          </div>
          <div className="text-center py-8 text-gray-500">
            Unable to load popular cards. Please try again later.
          </div>
        </div>
      </section>
    )
  }

  if (cards.length === 0) {
    return null
  }

  return (
    <section className="px-4 pt-2 pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl font-semibold">Popular Right Now</h2>
          <span className="text-xl animate-pulse">🔥</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <CardTile
              key={card.id}
              id={card.id}
              name={card.name}
              setCode={card.setCode}
              setName={card.setName}
              collectorNumber={card.collectorNumber}
              priceUsd={card.priceUsd}
              priceUsdFoil={card.priceUsdFoil}
              priceUsdEtched={card.priceUsdEtched}
              rarity={card.rarity}
              href={`/mtg/printing/${card.id}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
