// Search result types for better type safety
export interface SearchResultItem {
  groupId: string
  setCode: string
  collectorNumber: string
  variantLabel: string | null
  finishLabel: string | null
  variantSuffix: string | null
  id: string
  title: string
  setName: string | null
  imageNormalUrl: string | null
  rarity: string | null
  hasNonfoil: boolean
  hasFoil: boolean
  hasEtched: boolean
  priceUsd: number | null
  priceUsdFoil: number | null
  priceUsdEtched: number | null
  priceSort: number | null
  rel: number | null
}

export interface SearchFacets {
  sets: Array<{ code: string; name: string; count: number }>
  rarity: Array<{ key: string; count: number }>
  printing: Array<{ key: string; count: number }>
  approx?: boolean
}

export interface SearchResult {
  query: string
  page: number
  pageSize: number
  totalResults: number
  primary: SearchResultItem[]
  otherNameMatches: SearchResultItem[]
  broad: SearchResultItem[]
  nextPageToken: string | null
  facets: SearchFacets
}

// Cart types
export interface CartItem {
  printingId: string
  quantity: number
  unitPrice: number
  lineTotal: number
  name: string
  setCode: string
  setName: string | null
  collectorNumber: string
  imageUrl: string
}

export interface CartData {
  items: CartItem[]
  subtotal: number
  total: number
  count: number
}

// API response types
export interface SearchApiResponse extends SearchResult {
  // Additional API-specific fields can be added here
}

export interface CartApiResponse extends CartData {
  // Additional API-specific fields can be added here
}
