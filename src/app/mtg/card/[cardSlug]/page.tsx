import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SearchResultsGrid from '@/components/SearchResultsGrid'
import type { Metadata } from 'next'
import { getPricingConfig } from '@/lib/pricingData'
import {
  buildMtgCardGroupProductJsonLd,
  serializeJsonLd,
} from '@/lib/jsonLd/mtgCardProduct'

const SITE_ORIGIN = 'https://latamtcg.com'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ cardSlug: string }> }): Promise<Metadata> {
  const { cardSlug } = await props.params
  const name = decodeURIComponent(cardSlug).replace(/-/g, ' ')
  // Canonical URL uses the cardSlug as-is (Next.js handles URL encoding)
  const canonical = `${SITE_ORIGIN}/mtg/card/${cardSlug}`
  
  return {
    title: `${name} — All printings | LatamTCG`,
    description: `View all printings of ${name} available at LatamTCG. Compare prices and find the perfect version for your collection.`,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${name} — All printings | LatamTCG`,
      description: `View all printings of ${name} available at LatamTCG.`,
      url: canonical,
    },
  }
}

export default async function CardPage(props: { params: Promise<{ cardSlug: string }> }) {
  const { cardSlug } = await props.params
  const name = decodeURIComponent(cardSlug).replace(/-/g, ' ')
  const count = await prisma.mtgCard.count({ where: { name: { equals: name, mode: 'insensitive' }, isPaper: true } })
  if (count === 0) return notFound()

  const [printings, pricingConfig] = await Promise.all([
    prisma.mtgCard.findMany({
      where: { name: { equals: name, mode: 'insensitive' }, isPaper: true },
      select: {
        scryfallId: true,
        priceUsd: true,
        priceUsdFoil: true,
        priceUsdEtched: true,
        computedPriceClp: true,
      },
    }),
    getPricingConfig(),
  ])

  const productJsonLd = buildMtgCardGroupProductJsonLd({
    cardName: name,
    cardSlug,
    siteOrigin: SITE_ORIGIN,
    printings,
    config: pricingConfig,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">{name}</h1>
        <SearchResultsGrid initialQuery={`"${name}"`} />
      </div>
    </>
  )
}


