'use client'

import * as React from 'react'
import Link from 'next/link'
import { Sheet } from '@/components/ui/sheet'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import pkg from '../../../package.json'

type Set = {
  set_code: string
  set_name: string
  released_at: Date | null
}

export function LeftCatalogMenu() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [desktopOpen, setDesktopOpen] = React.useState(false)
  const [sets, setSets] = React.useState<Set[]>([])
  const [accordionValue, setAccordionValue] = React.useState<string[]>([])
  const desktopTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === locale) return

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

  // Load accordion state from localStorage
  React.useEffect(() => {
    try {
      const shop = localStorage.getItem('lcm:shop') === 'open'
      const sets = localStorage.getItem('lcm:sets') === 'open'
      const filters = localStorage.getItem('lcm:filters') === 'open'
      // Only one can be open at a time, prioritize in order: shop, sets, filters
      const value = shop ? 'shop' : sets ? 'sets' : filters ? 'filters' : ''
      setAccordionValue(value ? [value] : [])
    } catch {}
  }, [])

  // Persist accordion state to localStorage
  React.useEffect(() => {
    try {
      const currentValue = accordionValue[0] || ''
      localStorage.setItem('lcm:shop', currentValue === 'shop' ? 'open' : 'closed')
      localStorage.setItem('lcm:sets', currentValue === 'sets' ? 'open' : 'closed')
      localStorage.setItem('lcm:filters', currentValue === 'filters' ? 'open' : 'closed')
    } catch {}
  }, [accordionValue])

  // Fetch sets on mount
  React.useEffect(() => {
    async function fetchSets() {
      try {
        // Add cache-busting to ensure fresh data
        const response = await fetch(`/api/sets/latest?t=${Date.now()}`)
        if (response.ok) {
          const data = await response.json()
          setSets(data)
        }
      } catch (err) {
        console.error('[LeftCatalogMenu] failed to fetch sets', err)
      }
    }
    fetchSets()
  }, [])

  // Desktop hover handlers
  const handleDesktopMouseEnter = React.useCallback(() => {
    if (desktopTimeoutRef.current) {
      clearTimeout(desktopTimeoutRef.current)
      desktopTimeoutRef.current = null
    }
    setDesktopOpen(true)
  }, [])

  const handleDesktopMouseLeave = React.useCallback(() => {
    desktopTimeoutRef.current = setTimeout(() => {
      setDesktopOpen(false)
    }, 150)
  }, [])

  // Close on escape
  React.useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        setDesktopOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const menuContent = (
    <div className="flex flex-col h-full max-h-[calc(100vh-40px)]" ref={panelRef}>
      {/* Header */}
      {isMobile && (
        <div className="sticky top-0 z-10 bg-background border-b p-3 md:p-4 flex items-center justify-end" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded hover:bg-accent"
            aria-label={t('nav.closeMenu')}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Body */}
      <ScrollArea className="flex-1 p-3 md:p-4">
        <Accordion type="single" value={accordionValue} onValueChange={(value) => setAccordionValue(value)}>
          {/* Shop Section */}
          <AccordionItem value="shop" className="mb-2">
            <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide text-muted-foreground py-2">
              {t('nav.shop')}
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <nav className="space-y-1">
                <Link
                  href="/mtg/search"
                  onClick={() => {
                    setMobileOpen(false)
                    setDesktopOpen(false)
                  }}
                  className="flex items-center justify-between h-11 px-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <span>{t('nav.singles')}</span>
                </Link>
                <Link
                  href="/mass-entry"
                  onClick={() => {
                    setMobileOpen(false)
                    setDesktopOpen(false)
                  }}
                  className="flex items-center justify-between h-11 px-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <span>{t('nav.massEntry')}</span>
                </Link>
              </nav>
            </AccordionContent>
          </AccordionItem>

          {/* Sets Section */}
          <AccordionItem value="sets" className="mb-2">
            <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide text-muted-foreground py-2">
              {t('nav.sets')}
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <nav className="space-y-1">
                {sets.map((set) => {
                  // Helper function to get parent set code
                  const getParentSetCode = (setCode: string, setName: string): string | null => {
                    const code = setCode.toLowerCase()
                    
                    // Pattern 1: Promo sets with "p" prefix (e.g., pspm -> spm, peoe -> eoe)
                    if (code.startsWith('p') && code.length > 1) {
                      const parentCode = code.substring(1)
                      // Only return if it looks like a valid parent (not just removing 'p' from a single letter)
                      if (parentCode.length >= 2) {
                        return parentCode
                      }
                    }
                    
                    // Pattern 2: Sets with " Promos" suffix in name (e.g., "Marvel's Spider-Man Promos" -> "Marvel's Spider-Man")
                    if (setName.toLowerCase().endsWith(' promos')) {
                      const parentName = setName.slice(0, -7) // Remove " Promos"
                      // Try to find parent set code from the sets list
                      const parentSet = sets.find(s => 
                        s.set_name.toLowerCase() === parentName.toLowerCase() && 
                        s.set_code.toLowerCase() !== code
                      )
                      if (parentSet) {
                        return parentSet.set_code.toLowerCase()
                      }
                    }
                    
                    // Pattern 3: Sets with " Promo" suffix (singular)
                    if (setName.toLowerCase().endsWith(' promo')) {
                      const parentName = setName.slice(0, -6) // Remove " Promo"
                      const parentSet = sets.find(s => 
                        s.set_name.toLowerCase() === parentName.toLowerCase() && 
                        s.set_code.toLowerCase() !== code
                      )
                      if (parentSet) {
                        return parentSet.set_code.toLowerCase()
                      }
                    }
                    
                    return null
                  }
                  
                  const setSymbolUrl = `https://svgs.scryfall.io/sets/${set.set_code.toLowerCase()}.svg`
                  const parentSetCode = getParentSetCode(set.set_code, set.set_name)
                  const parentSymbolUrl = parentSetCode ? `https://svgs.scryfall.io/sets/${parentSetCode}.svg` : null
                  const genericSymbolUrl = 'https://svgs.scryfall.io/sets/default.svg'
                  
                  return (
                    <Link
                      key={set.set_code}
                      href={`/mtg/search?set=${encodeURIComponent(set.set_code)}`}
                      onClick={() => {
                        setMobileOpen(false)
                        setDesktopOpen(false)
                      }}
                      className="flex items-center gap-2 h-11 px-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <img
                        src={setSymbolUrl}
                        alt={`${set.set_name} symbol`}
                        className="w-5 h-5 object-contain flex-shrink-0 set-symbol"
                        onError={(e) => {
                          const img = e.currentTarget
                          // If parent symbol exists, try loading it
                          if (parentSymbolUrl) {
                            img.src = parentSymbolUrl
                            img.onerror = () => {
                              // Try generic symbol as final fallback
                              img.src = genericSymbolUrl
                              img.onerror = () => {
                                // Hide image if generic symbol also fails
                                img.style.display = 'none'
                              }
                            }
                          } else {
                            // Try generic symbol as fallback
                            img.src = genericSymbolUrl
                            img.onerror = () => {
                              // Hide image if generic symbol also fails
                              img.style.display = 'none'
                            }
                          }
                        }}
                      />
                      <span className="flex-1 truncate">{set.set_name}</span>
                    </Link>
                  )
                })}
                <Link
                  href="/mtg/sets"
                  onClick={() => {
                    setMobileOpen(false)
                    setDesktopOpen(false)
                  }}
                  className="flex items-center justify-between h-11 px-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                >
                  <span>{t('nav.viewAllSets')}</span>
                </Link>
              </nav>
            </AccordionContent>
          </AccordionItem>

          {/* Quick Filters Section */}
          <AccordionItem value="filters" className="mb-2">
            <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide text-muted-foreground py-2">
              {t('nav.quickFilters')}
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <nav className="space-y-1">
                <Link
                  href="/mtg/search?printing=foil&printing=etched"
                  onClick={() => {
                    setMobileOpen(false)
                    setDesktopOpen(false)
                  }}
                  className="flex items-center justify-between h-11 px-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <span>{t('nav.foilEtched')}</span>
                </Link>
                <Link
                  href="/mtg/search?q=full+art+OR+showcase+OR+borderless"
                  onClick={() => {
                    setMobileOpen(false)
                    setDesktopOpen(false)
                  }}
                  className="flex items-center justify-between h-11 px-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <span>{t('nav.fullArtShowcase')}</span>
                </Link>
                <Link
                  href="/mtg/search?rarity=rare&rarity=mythic"
                  onClick={() => {
                    setMobileOpen(false)
                    setDesktopOpen(false)
                  }}
                  className="flex items-center justify-between h-11 px-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <span>{t('nav.rareMythic')}</span>
                </Link>
                {(() => {
                  // Get the two most recent sets
                  const twoMostRecentSets = sets.slice(0, 2)
                  // Build URL with set filters
                  const setParams = twoMostRecentSets.map(set => `set=${encodeURIComponent(set.set_code)}`).join('&')
                  const recentlyReleasedUrl = twoMostRecentSets.length > 0 
                    ? `/mtg/search?${setParams}&sort=release_desc`
                    : '/mtg/search?sort=release_desc'
                  
                  return (
                    <Link
                      href={recentlyReleasedUrl}
                      onClick={() => {
                        setMobileOpen(false)
                        setDesktopOpen(false)
                      }}
                      className="flex items-center justify-between h-11 px-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span>{t('nav.recentlyReleased')}</span>
                    </Link>
                  )
                })()}
              </nav>
            </AccordionContent>
          </AccordionItem>

          {/* Advanced Search */}
          <div className="mb-2">
            <Link
              href="/search/advanced"
              onClick={() => {
                setMobileOpen(false)
                setDesktopOpen(false)
              }}
              className="flex items-center justify-between h-11 px-2 rounded-lg hover:bg-accent transition-colors"
            >
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground py-2">{t('nav.advancedSearch')}</span>
            </Link>
          </div>
        </Accordion>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3 md:p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleLanguageChange('es')}
              className={`hover:text-foreground transition-colors ${locale === 'es' ? 'font-semibold text-foreground' : ''}`}
              disabled={isPending}
            >
              ES
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`hover:text-foreground transition-colors ${locale === 'en' ? 'font-semibold text-foreground' : ''}`}
              disabled={isPending}
            >
              EN
            </button>
          </div>
          <span>LatamTCG v{pkg.version}</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile: Hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden p-2 rounded hover:bg-accent"
        aria-label={t('nav.openMenu')}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile: Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="left">
        {menuContent}
      </Sheet>

      {/* Desktop: Trigger area */}
      <div
        className="hidden md:block relative"
        onMouseEnter={handleDesktopMouseEnter}
        onMouseLeave={handleDesktopMouseLeave}
      >
        <button
          ref={triggerRef}
          type="button"
          className="p-2 rounded hover:bg-accent transition-colors"
          aria-label={t('nav.openCatalogMenu')}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop: Floating panel */}
        {desktopOpen && (
          <div
            className="absolute left-0 top-full mt-2 w-[380px] max-h-[calc(100vh-120px)] rounded-r-2xl shadow-lg z-50 transition-all duration-200 ease-in-out overflow-hidden"
            style={{
              background: 'var(--card)',
              color: 'var(--text)',
              boxShadow: 'var(--shadow)',
            }}
            onMouseEnter={handleDesktopMouseEnter}
            onMouseLeave={handleDesktopMouseLeave}
          >
            {menuContent}
          </div>
        )}
      </div>
    </>
  )
}

