import { formatCardVariant } from '@/lib/cards/formatVariant'
import { formatDisplayName } from '@/lib/cardNames'
import { getScryfallNormalUrl } from '@/lib/images'

export type HubPrintingRow = {
  scryfallId: string
  name: string
  flavorName: string | null
  finishes: string[]
  promoTypes: string[]
  frameEffects: string[]
  borderColor: string | null
}

/**
 * CollectionPage + ItemList for /mtg/card/[cardSlug] (name-level hub).
 * Each ListItem references a printing PDP via Product stub (name, url, image only — no Offer).
 */
export function buildMtgCardHubCollectionJsonLd(args: {
  siteOrigin: string
  cardSlug: string
  hubDisplayName: string
  items: HubPrintingRow[]
}): Record<string, unknown> {
  const base = args.siteOrigin.replace(/\/$/, '')
  const hubUrl = `${base}/mtg/card/${args.cardSlug}`

  const itemListElement = args.items.map((row, i) => {
    const variant = formatCardVariant({
      finishes: row.finishes,
      promoTypes: row.promoTypes,
      frameEffects: row.frameEffects,
      borderColor: row.borderColor,
    })
    const listName = `${formatDisplayName(row.name, row.flavorName)}${variant.suffix}`
    const printingUrl = `${base}/mtg/printing/${encodeURIComponent(row.scryfallId)}`
    const imageUrl = getScryfallNormalUrl(row.scryfallId)

    const productRef: Record<string, unknown> = {
      '@type': 'Product',
      name: listName,
      url: printingUrl,
    }
    if (imageUrl) {
      productRef.image = [imageUrl]
    }

    return {
      '@type': 'ListItem',
      position: i + 1,
      name: listName,
      item: productRef,
    }
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${args.hubDisplayName} — todas las impresiones | LatamTCG`,
    url: hubUrl,
    description: `Magic: The Gathering — ${args.hubDisplayName}. Compará impresiones y precios en LatamTCG.`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: itemListElement.length,
      itemListElement,
    },
  }
}
