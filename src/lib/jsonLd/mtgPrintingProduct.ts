/**
 * Product + Offer JSON-LD for /mtg/printing/[printingId] (single SKU PDP).
 * Must stay aligned with visible default variant (initialVariant) and pricing config.
 */
export function buildMtgPrintingProductJsonLd(args: {
  name: string
  description: string
  imageUrl: string | null
  canonicalUrl: string
  /** Offer price; omit from schema when null */
  priceAmount: number | null
  priceCurrency: 'CLP' | 'USD'
  inStock: boolean
}): Record<string, unknown> {
  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: args.name,
    description: args.description,
  }

  if (args.imageUrl) {
    product.image = [args.imageUrl]
  }

  const offers: Record<string, unknown> = {
    '@type': 'Offer',
    url: args.canonicalUrl,
    priceCurrency: args.priceCurrency,
    availability: args.inStock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  }

  if (args.priceAmount != null && args.inStock) {
    if (args.priceCurrency === 'CLP') {
      offers.price = String(Math.round(args.priceAmount))
    } else {
      offers.price = args.priceAmount.toFixed(2)
    }
  }

  product.offers = offers
  return product
}
