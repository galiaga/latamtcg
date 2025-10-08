export type SortOption = 'relevance' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'release_desc'

export const SORT_OPTIONS: SortOption[] = ['relevance', 'name_asc', 'name_desc', 'price_asc', 'price_desc', 'release_desc']

export function parseSortParam(input: unknown, fallback: SortOption = 'relevance'): SortOption {
  const raw = String(input || '').toLowerCase()
  return (SORT_OPTIONS as string[]).includes(raw) ? (raw as SortOption) : fallback
}


