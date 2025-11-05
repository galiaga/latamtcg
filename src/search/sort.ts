export type SortOption = 'relevance' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'release_desc' | 'most-popular'

export const SORT_OPTIONS: SortOption[] = ['relevance', 'name_asc', 'name_desc', 'price_asc', 'price_desc', 'release_desc', 'most-popular']

export function parseSortParam(input: unknown, fallback: SortOption = 'relevance'): SortOption {
  const raw = String(input || '').toLowerCase()
  // Check if most-popular is enabled and use it as default if no sort specified
  const mostPopularEnabled = process.env.MOST_POPULAR_ENABLED === 'true'
  const defaultFallback = mostPopularEnabled ? 'most-popular' : 'relevance'
  const actualFallback = fallback === 'relevance' ? defaultFallback : fallback
  return (SORT_OPTIONS as string[]).includes(raw) ? (raw as SortOption) : actualFallback
}


