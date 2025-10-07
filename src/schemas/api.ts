import { z } from 'zod'

// Search API schemas
export const SearchParamsSchema = z.object({
  q: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(25).optional().default(25),
  limit: z.coerce.number().int().min(1).max(25).optional(),
  exact: z.enum(['0', '1']).optional(),
  facetAll: z.enum(['0', '1']).optional(),
  sort: z.enum(['relevance', 'name', 'price_asc', 'price_desc']).optional().default('relevance'),
  mode: z.enum(['name', 'text', 'all']).optional().default('name'),
  debug: z.enum(['0', '1']).optional(),
  printing: z.array(z.enum(['normal', 'foil', 'etched'])).optional().default([]),
  sets: z.array(z.string()).optional().default([]),
  rarity: z.array(z.enum(['common', 'uncommon', 'rare', 'mythic'])).optional().default([]),
  groupId: z.string().optional(),
})

export const SearchResponseSchema = z.object({
  query: z.string(),
  page: z.number(),
  pageSize: z.number(),
  totalResults: z.number(),
  primary: z.array(z.object({
    groupId: z.string(),
    setCode: z.string(),
    collectorNumber: z.string(),
    variantLabel: z.string().nullable(),
    finishLabel: z.string().nullable(),
    variantSuffix: z.string().nullable(),
    id: z.string(),
    title: z.string(),
    setName: z.string().nullable(),
    imageNormalUrl: z.string().nullable(),
    rarity: z.string().nullable(),
    hasNonfoil: z.boolean(),
    hasFoil: z.boolean(),
    hasEtched: z.boolean(),
    priceUsd: z.number().nullable(),
    priceUsdFoil: z.number().nullable(),
    priceUsdEtched: z.number().nullable(),
    priceSort: z.number().nullable(),
    rel: z.number().nullable(),
  })),
  otherNameMatches: z.array(z.object({
    groupId: z.string(),
    setCode: z.string(),
    collectorNumber: z.string(),
    variantLabel: z.string().nullable(),
    finishLabel: z.string().nullable(),
    variantSuffix: z.string().nullable(),
    id: z.string(),
    title: z.string(),
    setName: z.string().nullable(),
    imageNormalUrl: z.string().nullable(),
    rarity: z.string().nullable(),
    hasNonfoil: z.boolean(),
    hasFoil: z.boolean(),
    hasEtched: z.boolean(),
    priceUsd: z.number().nullable(),
    priceUsdFoil: z.number().nullable(),
    priceUsdEtched: z.number().nullable(),
    priceSort: z.number().nullable(),
    rel: z.number().nullable(),
  })),
  broad: z.array(z.object({
    groupId: z.string(),
    setCode: z.string(),
    collectorNumber: z.string(),
    variantLabel: z.string().nullable(),
    finishLabel: z.string().nullable(),
    variantSuffix: z.string().nullable(),
    id: z.string(),
    title: z.string(),
    setName: z.string().nullable(),
    imageNormalUrl: z.string().nullable(),
    rarity: z.string().nullable(),
    hasNonfoil: z.boolean(),
    hasFoil: z.boolean(),
    hasEtched: z.boolean(),
    priceUsd: z.number().nullable(),
    priceUsdFoil: z.number().nullable(),
    priceUsdEtched: z.number().nullable(),
    priceSort: z.number().nullable(),
    rel: z.number().nullable(),
  })),
  nextPageToken: z.string().nullable(),
  facets: z.object({
    sets: z.array(z.object({
      code: z.string(),
      name: z.string(),
      count: z.number(),
    })),
    rarity: z.array(z.object({
      key: z.string(),
      count: z.number(),
    })),
    printing: z.array(z.object({
      key: z.string(),
      count: z.number(),
    })),
    approx: z.boolean().optional(),
  }),
})

// Cart API schemas
export const CartItemSchema = z.object({
  printingId: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
  name: z.string(),
  setCode: z.string(),
  setName: z.string().nullable(),
  collectorNumber: z.string(),
  imageUrl: z.string(),
})

export const CartResponseSchema = z.object({
  items: z.array(CartItemSchema),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  count: z.number().int().min(0),
})

// Cart action schemas
export const CartAddSchema = z.object({
  printingId: z.string(),
  quantity: z.number().int().min(1).optional().default(1),
})

export const CartUpdateSchema = z.object({
  printingId: z.string(),
  action: z.enum(['inc', 'dec', 'set']),
  quantity: z.number().int().min(1).optional(),
})

export const CartMergeSchema = z.object({
  items: z.array(CartItemSchema),
})

// Type exports
export type SearchParams = z.infer<typeof SearchParamsSchema>
export type SearchResponse = z.infer<typeof SearchResponseSchema>
export type CartItem = z.infer<typeof CartItemSchema>
export type CartResponse = z.infer<typeof CartResponseSchema>
export type CartAddRequest = z.infer<typeof CartAddSchema>
export type CartUpdateRequest = z.infer<typeof CartUpdateSchema>
export type CartMergeRequest = z.infer<typeof CartMergeSchema>
