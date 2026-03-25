import type { getPrintingById } from '@/lib/printings'
import type { PricingConfig } from '@/lib/pricingData'
import type { VariantInfo } from '@/helpers/pdpVariants'
import { formatCardVariant } from '@/lib/cards/formatVariant'
import { formatDisplayName } from '@/lib/cardNames'
import { formatCLP, formatUsd } from '@/lib/format'
import { getTranslations } from 'next-intl/server'
import { buildMtgPrintingProductJsonLd } from '@/lib/jsonLd/mtgPrintingProduct'

type PrintingData = Awaited<ReturnType<typeof getPrintingById>>

/**
 * Product JSON-LD aligned with the visible default variant (same as VariantSectionClient).
 */
export async function buildPrintingProductJsonLdForPage(args: {
  printingId: string
  data: PrintingData
  pricingConfig: PricingConfig
  initialVariant: VariantInfo
}): Promise<Record<string, unknown>> {
  const { printingId, data, pricingConfig, initialVariant } = args
  const t = await getTranslations()

  const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://latamtcg.com'
  const canonicalUrl = `${baseUrl}/mtg/printing/${printingId}`

  const variantForLd = formatCardVariant({
    finishes: data.finishes,
    promoTypes: data.promoTypes,
    frameEffects: data.frameEffects,
    borderColor: data.borderColor,
  })
  const productNameForLd = `${formatDisplayName(data.name, data.flavorName)}${variantForLd.suffix}`

  const variantLabelForLd = initialVariant.label || t('card.card')
  const setInfoForLd = data.setName || (data.setCode || '').toUpperCase()
  const priceTextForLd =
    initialVariant.priceClp != null
      ? formatCLP(initialVariant.priceClp)
      : formatUsd(data.priceUsd)
  const descriptionForLd = `${variantLabelForLd} ${t('card.magicCardFrom')} ${setInfoForLd}. ${productNameForLd}. ${t('card.price')}: ${priceTextForLd}.`

  const hasPositivePrice =
    initialVariant.priceClp != null &&
    Number.isFinite(initialVariant.priceClp) &&
    initialVariant.priceClp > 0
  const priceAmount = hasPositivePrice ? initialVariant.priceClp : null
  const priceCurrency: 'CLP' | 'USD' = pricingConfig.useCLP ? 'CLP' : 'USD'
  const inStock = Boolean(initialVariant.available && hasPositivePrice)

  return buildMtgPrintingProductJsonLd({
    name: productNameForLd,
    description: descriptionForLd,
    imageUrl: data.imageUrl,
    canonicalUrl,
    priceAmount,
    priceCurrency,
    inStock,
  })
}
