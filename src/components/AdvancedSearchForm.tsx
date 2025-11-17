'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SetSymbol } from './SetSymbol'
import { useTranslations } from 'next-intl'

interface Set {
  set_code: string
  set_name: string
  released_at: Date | null
  set_type: string | null
}

interface AdvancedSearchFormProps {
  sets: Set[]
}

export function AdvancedSearchForm({ sets }: AdvancedSearchFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedSets, setSelectedSets] = React.useState<string[]>([])
  const [selectedRarity, setSelectedRarity] = React.useState<string[]>([])
  const [selectedPrinting, setSelectedPrinting] = React.useState<string[]>([])
  const [sortBy, setSortBy] = React.useState('relevance')
  const [showUnavailable, setShowUnavailable] = React.useState(false)
  const [setSearchTerm, setSetSearchTerm] = React.useState('')

  const rarityOptions = [
    { value: 'common', label: t('search.common') },
    { value: 'uncommon', label: t('search.uncommon') },
    { value: 'rare', label: t('search.rare') },
    { value: 'mythic', label: t('search.mythic') },
  ]

  const printingOptions = [
    { value: 'normal', label: t('search.normal') },
    { value: 'foil', label: t('search.foil') },
    { value: 'etched', label: t('search.etched') },
  ]

  const sortOptions = [
    { value: 'relevance', label: t('search.relevance') },
    { value: 'name_asc', label: t('search.nameAZ') },
    { value: 'name_desc', label: t('search.nameZA') },
    { value: 'price_asc', label: t('search.priceLowToHigh') },
    { value: 'price_desc', label: t('search.priceHighToLow') },
    { value: 'release_desc', label: t('search.releaseDateNewest') },
    { value: 'most-popular', label: t('search.mostPopular') },
  ]

  // Filter sets based on search term
  const filteredSets = React.useMemo(() => {
    if (!setSearchTerm.trim()) return sets
    const term = setSearchTerm.toLowerCase()
    return sets.filter(
      (set) =>
        set.set_name.toLowerCase().includes(term) ||
        set.set_code.toLowerCase().includes(term)
    )
  }, [sets, setSearchTerm])

  const handleSetToggle = (setCode: string) => {
    setSelectedSets((prev) =>
      prev.includes(setCode)
        ? prev.filter((s) => s !== setCode)
        : [...prev, setCode]
    )
  }

  const handleRarityToggle = (rarity: string) => {
    setSelectedRarity((prev) =>
      prev.includes(rarity)
        ? prev.filter((r) => r !== rarity)
        : [...prev, rarity]
    )
  }

  const handlePrintingToggle = (printing: string) => {
    setSelectedPrinting((prev) =>
      prev.includes(printing)
        ? prev.filter((p) => p !== printing)
        : [...prev, printing]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()

    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    }

    selectedSets.forEach((set) => {
      params.append('set', set)
    })

    selectedRarity.forEach((rarity) => {
      params.append('rarity', rarity)
    })

    selectedPrinting.forEach((printing) => {
      params.append('printing', printing)
    })

    if (sortBy !== 'relevance') {
      params.set('sort', sortBy)
    }

    if (showUnavailable) {
      params.set('showUnavailable', 'true')
    }

    router.push(`/mtg/search?${params.toString()}`)
  }

  const handleClear = () => {
    setSearchQuery('')
    setSelectedSets([])
    setSelectedRarity([])
    setSelectedPrinting([])
    setSortBy('relevance')
    setShowUnavailable(false)
    setSetSearchTerm('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className="rounded-xl border p-6"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Search Query */}
        <div className="mb-6">
          <label htmlFor="search-query" className="block text-sm font-semibold mb-2">
            {t('search.searchQuery')}
          </label>
          <input
            id="search-query"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search.searchQueryPlaceholder')}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        {/* Sets */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            {t('search.sets')}
          </label>
          <input
            type="text"
            value={setSearchTerm}
            onChange={(e) => setSetSearchTerm(e.target.value)}
            placeholder={t('search.searchSets')}
            className="w-full px-4 py-2 rounded-lg border mb-3"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
          <div className="max-h-48 overflow-y-auto border rounded-lg p-2" style={{ borderColor: 'var(--border)' }}>
            {filteredSets.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">{t('search.noSetsFound')}</p>
            ) : (
              <div className="space-y-1">
                {filteredSets.slice(0, 50).map((set) => (
                  <label
                    key={set.set_code}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSets.includes(set.set_code)}
                      onChange={() => handleSetToggle(set.set_code)}
                      className="rounded"
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-5 h-5 flex-shrink-0">
                        <SetSymbol
                          setCode={set.set_code}
                          setName={set.set_name}
                          allSets={sets}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-sm truncate">{set.set_name}</span>
                      <span className="text-xs text-muted-foreground font-mono uppercase flex-shrink-0">
                        {set.set_code}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          {selectedSets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedSets.map((setCode) => {
                const set = sets.find((s) => s.set_code === setCode)
                return (
                  <span
                    key={setCode}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                    style={{
                      background: 'var(--primarySoft)',
                      color: 'var(--primary)',
                    }}
                  >
                    {set?.set_name || setCode}
                    <button
                      type="button"
                      onClick={() => handleSetToggle(setCode)}
                      className="hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Rarity */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            {t('search.rarity')}
          </label>
          <div className="flex flex-wrap gap-2">
            {rarityOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-3 py-2 rounded border cursor-pointer hover:bg-accent"
                style={{ borderColor: 'var(--border)' }}
              >
                <input
                  type="checkbox"
                  checked={selectedRarity.includes(option.value)}
                  onChange={() => handleRarityToggle(option.value)}
                  className="rounded"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Printing */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            {t('search.printing')}
          </label>
          <div className="flex flex-wrap gap-2">
            {printingOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-3 py-2 rounded border cursor-pointer hover:bg-accent"
                style={{ borderColor: 'var(--border)' }}
              >
                <input
                  type="checkbox"
                  checked={selectedPrinting.includes(option.value)}
                  onChange={() => handlePrintingToggle(option.value)}
                  className="rounded"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="mb-6">
          <label htmlFor="sort-by" className="block text-sm font-semibold mb-2">
            {t('search.sortBy')}
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Show Unavailable */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnavailable}
              onChange={(e) => setShowUnavailable(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">{t('search.showUnavailableCards')}</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-6 py-3 rounded-lg font-semibold transition-colors"
            style={{
              background: 'var(--primary)',
              color: 'var(--primaryForeground)',
            }}
          >
            {t('search.search')}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-3 rounded-lg border font-semibold transition-colors hover:bg-accent"
            style={{ borderColor: 'var(--border)' }}
          >
            {t('search.clear')}
          </button>
        </div>
      </div>
    </form>
  )
}

