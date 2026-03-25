import type { PricingConfig } from '@/lib/pricingData'
import { computePriceCLP, type PricingInputs } from '@/lib/pricing'
import { getScryfallNormalUrl } from '@/lib/images'

export type MtgCardPrintingForJsonLd = {
  scryfallId: string
  priceUsd: unknown
  priceUsdFoil: unknown
  priceUsdEtched: unknown
  computedPriceClp: number | null
}

function pricingInputs(config: PricingConfig, usd: number): PricingInputs {
  return {
    tcgPriceUsd: usd,
    fxClp: config.fxClp,
    alphaLow: config.alphaLow,
    alphaMid: config.alphaMid,
    alphaHigh: config.alphaHigh,
    alphaTierLowUsd: config.alphaTierLowUsd,
    alphaTierMidUsd: config.alphaTierMidUsd,
    betaClp: 0,
    priceMinPerCardClp: config.priceMinPerCardClp,
    roundToStepClp: config.roundToStepClp,
  }
}

function bestUsd(p: MtgCardPrintingForJsonLd): number | null {
  const n = p.priceUsd != null ? Number(p.priceUsd) : NaN
  const f = p.priceUsdFoil != null ? Number(p.priceUsdFoil) : NaN
  const e = p.priceUsdEtched != null ? Number(p.priceUsdEtched) : NaN
  if (Number.isFinite(n) && n > 0) return n
  if (Number.isFinite(f) && f > 0) return f
  if (Number.isFinite(e) && e > 0) return e
  return null
}

function clpForPrinting(p: MtgCardPrintingForJsonLd, config: PricingConfig): number | null {
  const usd = bestUsd(p)
  if (usd == null) return null
  if (config.useCLP && p.computedPriceClp != null && p.computedPriceClp > 0) {
    return p.computedPriceClp
  }
  return computePriceCLP(usd, pricingInputs(config, usd))
}

/** Safe for embedding in <script type="application/ld+json"> */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/**
 * Product JSON-LD for /mtg/card/[cardSlug] (all printings of one card name).
 * Uses the lowest CLP among priced printings as the representative offer; canonical URL is the group page.
 */
export function buildMtgCardGroupProductJsonLd(args: {
  cardName: string
  cardSlug: string
  siteOrigin: string
  printings: MtgCardPrintingForJsonLd[]
  config: PricingConfig
}): Record<string, unknown> {
  const canonical = `${args.siteOrigin.replace(/\/$/, '')}/mtg/card/${args.cardSlug}`

  const priced = args.printings
    .map((p) => ({ p, clp: clpForPrinting(p, args.config) }))
    .filter((x): x is { p: MtgCardPrintingForJsonLd; clp: number } => x.clp != null && x.clp > 0)

  const best =
    priced.length === 0 ? null : priced.reduce((a, b) => (a.clp <= b.clp ? a : b))

  const imageUrl = best
    ? getScryfallNormalUrl(best.p.scryfallId)
    : args.printings[0]
      ? getScryfallNormalUrl(args.printings[0].scryfallId)
      : null

  const description = `Magic: The Gathering — ${args.cardName}. Compará impresiones, precios en pesos chilenos y comprá en LatamTCG.`

  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: args.cardName,
    description,
  }

  if (imageUrl) {
    product.image = [imageUrl]
  }

  const offers: Record<string, unknown> = {
    '@type': 'Offer',
    url: canonical,
    priceCurrency: 'CLP',
    availability: best
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  }

  if (best) {
    offers.price = String(Math.round(best.clp))
  }

  product.offers = offers
  return product
}
