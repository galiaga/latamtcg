'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { getScryfallNormalUrl } from '@/lib/images'
import { usePricing } from './PricingProvider'
import { getDisplayPrice, formatPrice } from '@/lib/pricingClient'
import { useDelayedFlag } from '@/hooks/useDelayedFlag'

interface CardPreview {
  id: string
  name: string
  setCode: string
  setName: string
  imageUrl: string
  priceUsd: number
  priceChange24h?: number | null
  priceChange7d?: number | null
}

interface MostExpensiveRecentCardsResponse {
  cards: CardPreview[]
}

const fetcher = async (url: string): Promise<MostExpensiveRecentCardsResponse> => {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function MostExpensiveRecentCardsCarousel() {
  const t = useTranslations()
  const router = useRouter()
  const { config } = usePricing()
  const listRef = useRef<HTMLDivElement | null>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const hasStartedRef = useRef<boolean>(false)
  const autoScrollRef = useRef<number | null>(null)
  const lastScrollTimeRef = useRef<number>(Date.now())
  const scrollSpeedRef = useRef<number>(0.3) // pixels per frame - smooth and elegant
  const isResettingRef = useRef<boolean>(false)
  const pointerState = useRef<{ id: number | null; startX: number; startScroll: number; moved: boolean }>({
    id: null,
    startX: 0,
    startScroll: 0,
    moved: false,
  })

  const { data, error, isLoading } = useSWR<MostExpensiveRecentCardsResponse>(
    '/api/cards/most-expensive-recent?limit=10&days=60',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
    }
  )

  const showSkeleton = useDelayedFlag(150, isLoading)

  function scrollByItems(dir: 1 | -1) {
    const el = listRef.current
    if (!el) return
    // Calculate scroll step based on card width (responsive)
    const cardWidth = 280 // Base card width in pixels
    const gap = 16 // Gap between cards
    const step = cardWidth + gap
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  // Calculate responsive scroll speed based on screen size
  useEffect(() => {
    const updateScrollSpeed = () => {
      if (typeof window === 'undefined') return
      
      const width = window.innerWidth
      // Base speed: 0.3 pixels per frame
      // Adjust based on viewport width for consistent visual speed
      // Smaller screens: slower (fewer cards visible, feels faster)
      // Larger screens: faster (more cards visible, feels slower)
      if (width < 640) {
        // Mobile: slower speed (2-3 cards visible)
        scrollSpeedRef.current = 0.2
      } else if (width < 1024) {
        // Tablet: medium speed (4-5 cards visible)
        scrollSpeedRef.current = 0.3
      } else {
        // Desktop: faster speed (6+ cards visible)
        scrollSpeedRef.current = 0.4
      }
    }

    updateScrollSpeed()
    window.addEventListener('resize', updateScrollSpeed)
    return () => window.removeEventListener('resize', updateScrollSpeed)
  }, [])

  // Auto-scroll animation with seamless infinite loop
  useEffect(() => {
    // Early exit conditions
    if (!data?.cards.length || showSkeleton) {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current)
        autoScrollRef.current = null
      }
      return
    }

    const el = listRef.current
    if (!el) return

    // Calculate the width of one set of cards (before duplication)
    const cardWidth = 280
    const gap = 16
    const singleSetWidth = data.cards.length * (cardWidth + gap) - gap

    const animate = () => {
      // Check if we should continue
      if (!el || isPaused || dragging || !data?.cards.length) {
        if (autoScrollRef.current) {
          cancelAnimationFrame(autoScrollRef.current)
          autoScrollRef.current = null
        }
        return
      }

      // Ensure element has dimensions
      if (el.scrollWidth === 0 || el.clientWidth === 0) {
        autoScrollRef.current = requestAnimationFrame(animate)
        return
      }

      const scrollLeft = el.scrollLeft
      const maxScroll = el.scrollWidth - el.clientWidth

      // Handle seamless loop reset
      if (maxScroll > 0 && !isResettingRef.current && scrollLeft >= singleSetWidth - 2) {
        isResettingRef.current = true
        // Reset position seamlessly
        el.scrollLeft = scrollLeft - singleSetWidth
        isResettingRef.current = false
        autoScrollRef.current = requestAnimationFrame(animate)
        return
      }

      // Only scroll if there's room
      if (maxScroll > 0 && scrollLeft < maxScroll - 1) {
        el.scrollLeft += scrollSpeedRef.current
      }

      // Continue animation
      autoScrollRef.current = requestAnimationFrame(animate)
    }

    // Start animation after element is ready
    const tryStart = () => {
      if (!el) {
        setTimeout(tryStart, 100)
        return
      }

      // Check if element is ready
      if (el.scrollWidth === 0 || el.clientWidth === 0) {
        setTimeout(tryStart, 100)
        return
      }

      // Check if we have scrollable content (with duplicated cards)
      if (el.scrollWidth <= el.clientWidth) {
        setTimeout(tryStart, 100)
        return
      }

      // Start animation
      el.scrollLeft = 0
      isResettingRef.current = false
      hasStartedRef.current = true
      autoScrollRef.current = requestAnimationFrame(animate)
    }

    // Start after a delay to ensure DOM is ready
    const startTimer = setTimeout(tryStart, 500)

    return () => {
      clearTimeout(startTimer)
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current)
        autoScrollRef.current = null
      }
      isResettingRef.current = false
      hasStartedRef.current = false
    }
  }, [data?.cards.length, isPaused, dragging, showSkeleton])

  // Update navigation button states based on scroll position
  useEffect(() => {
    const el = listRef.current
    if (!el || !data?.cards.length) return

    const updateButtons = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setCanLeft(scrollLeft > 0)
      setCanRight(scrollLeft < scrollWidth - clientWidth - 1)
    }

    updateButtons()
    el.addEventListener('scroll', updateButtons)
    const resizeObserver = new ResizeObserver(updateButtons)
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', updateButtons)
      resizeObserver.disconnect()
    }
  }, [data?.cards.length])

  // Handle drag interactions
  useEffect(() => {
    const el = listRef.current
    if (!el) return

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0 || !el) return
      setIsPaused(true)
      pointerState.current.id = e.pointerId
      pointerState.current.startX = e.clientX
      pointerState.current.startScroll = el.scrollLeft
      pointerState.current.moved = false
      setDragging(false)
      try {
        el.setPointerCapture(e.pointerId)
      } catch {}
    }

    function onPointerMove(e: PointerEvent) {
      if (pointerState.current.id !== e.pointerId || !el) return
      const dx = e.clientX - pointerState.current.startX
      if (Math.abs(dx) > 6) {
        pointerState.current.moved = true
        setDragging(true)
        e.preventDefault()
        el.scrollLeft = pointerState.current.startScroll - dx
      }
    }

    function endDrag(e: PointerEvent) {
      if (pointerState.current.id !== e.pointerId || !el) return
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {}
      pointerState.current.id = null
      setTimeout(() => {
        setDragging(false)
        // Resume auto-scroll after drag ends
        setTimeout(() => setIsPaused(false), 1000)
      }, 0)
    }

    function onClickCapture(ev: MouseEvent) {
      if (dragging || pointerState.current.moved) {
        ev.preventDefault()
        ev.stopPropagation()
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('pointerleave', endDrag)
    el.addEventListener('click', onClickCapture, true)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('pointerleave', endDrag)
      el.removeEventListener('click', onClickCapture, true)
    }
  }, [dragging])

  // Hide component if error or no cards
  if (error || (!isLoading && (!data || !data.cards || data.cards.length === 0))) {
    return null
  }

  const cards = data?.cards || []

  return (
    <section
      className="py-6 md:py-8 bg-gradient-to-b from-white/50 to-transparent"
      aria-labelledby="most-expensive-recent-heading"
    >
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-4 md:mb-6">
          <h2
            id="most-expensive-recent-heading"
            className="text-2xl md:text-3xl font-bold mb-1"
            style={{ letterSpacing: '-0.01em' }}
          >
            {t('mostExpensiveRecent.title')}
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            {t('mostExpensiveRecent.subtitle')}
          </p>
        </header>

        {showSkeleton ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[280px] animate-pulse"
                aria-hidden="true"
              >
                <div className="aspect-[63/88] bg-gray-200 rounded-lg mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Gradient overlays */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />

            {/* Scrollable carousel */}
            <div
              id="most-expensive-recent-scroll"
              ref={listRef}
              role="list"
              aria-label={t('mostExpensiveRecent.title')}
              data-dragging={dragging ? 'true' : 'false'}
              className="flex gap-4 overflow-x-auto scroll-px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-opacity duration-300"
              style={{ 
                touchAction: 'pan-x', 
                cursor: dragging ? 'grabbing' : 'grab',
                scrollBehavior: 'auto', // Use auto for smooth programmatic scrolling
              }}
              onMouseEnter={() => {
                setIsPaused(true)
              }}
              onMouseLeave={() => {
                setIsPaused(false)
              }}
              onFocus={() => {
                setIsPaused(true)
              }}
              onBlur={(e) => {
                // Only unpause if focus is moving outside the carousel
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsPaused(false)
                }
              }}
              onKeyDown={(e) => {
                const el = listRef.current
                if (!el) return
                setIsPaused(true)
                const cardWidth = 280
                const gap = 16
                const step = cardWidth + gap
                if (e.key === 'ArrowRight') {
                  e.preventDefault()
                  el.scrollBy({ left: step, behavior: 'smooth' })
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault()
                  el.scrollBy({ left: -step, behavior: 'smooth' })
                } else if (e.key === 'Home') {
                  e.preventDefault()
                  el.scrollTo({ left: 0, behavior: 'smooth' })
                } else if (e.key === 'End') {
                  e.preventDefault()
                  el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
                }
                // Resume auto-scroll after a delay
                setTimeout(() => setIsPaused(false), 3000)
              }}
            >
              {/* Render cards twice for seamless infinite scroll */}
              {[...cards, ...cards].map((card, index) => {
                const handleClick = (e: React.MouseEvent) => {
                  e.preventDefault()
                  setIsPaused(true)
                  router.push(`/mtg/printing/${card.id}`)
                  setTimeout(() => setIsPaused(false), 2000)
                }

                const displayPrice = getDisplayPrice(
                  {
                    priceUsd: card.priceUsd,
                    priceUsdFoil: null,
                    priceUsdEtched: null,
                    computedPriceClp: null,
                  },
                  config
                )

                return (
                  <div
                    key={`${card.id}-${index}`}
                    role="listitem"
                    className="flex-shrink-0 w-[280px]"
                  >
                    <button
                      onClick={handleClick}
                      className="group block w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg transition-all duration-200 hover:scale-105"
                      aria-label={`${card.name} — ${card.setName}`}
                    >
                      <div className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/25 animate-[fadeIn_0.3s_ease-out]">
                        {/* Card image */}
                        <div className="px-3 pt-3">
                          <div className="aspect-[63/88] relative">
                            <div className="card-mask h-full w-full">
                              <img
                                src={getScryfallNormalUrl(card.id)}
                                alt={`${card.name} — ${card.setName}`}
                                className="w-full h-full object-contain transition-all duration-300 group-hover:opacity-90 group-hover:brightness-110"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Card info */}
                        <div className="px-3 pb-3">
                          <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1">
                            {card.name}
                          </h3>
                          <div className="text-xs text-gray-500 truncate mb-2">
                            {card.setName} • {card.setCode.toUpperCase()}
                          </div>
                          <div className="text-base font-semibold text-[var(--fg-strong)]">
                            {displayPrice ? formatPrice(displayPrice, config) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Navigation buttons */}
            {canLeft && (
              <button
                aria-label={t('mostExpensiveRecent.previousCards')}
                aria-controls="most-expensive-recent-scroll"
                onClick={() => scrollByItems(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border backdrop-blur px-3 py-2 transition duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-20"
                style={{
                  background: 'color-mix(in oklab, white 90%, transparent)',
                  borderColor: 'var(--border)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <ChevronLeftIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            {canRight && (
              <button
                aria-label={t('mostExpensiveRecent.nextCards')}
                aria-controls="most-expensive-recent-scroll"
                onClick={() => scrollByItems(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border backdrop-blur px-3 py-2 transition duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-20"
                style={{
                  background: 'color-mix(in oklab, white 90%, transparent)',
                  borderColor: 'var(--border)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <ChevronRightIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
