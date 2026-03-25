import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SearchResultsGrid from '@/components/SearchResultsGrid'
import type { Metadata } from 'next'
import { buildMtgCardHubCollectionJsonLd } from '@/lib/jsonLd/mtgCardHub'
import { serializeJsonLd } from '@/lib/jsonLd/serialize'

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

  const printings = await prisma.mtgCard.findMany({
    where: { name: { equals: name, mode: 'insensitive' }, isPaper: true },
    select: {
      scryfallId: true,
      name: true,
      flavorName: true,
      finishes: true,
      promoTypes: true,
      frameEffects: true,
      borderColor: true,
      releasedAt: true,
      setCode: true,
      collectorNumber: true,
    },
    orderBy: [{ releasedAt: 'desc' }, { setCode: 'asc' }, { collectorNumber: 'asc' }],
  })

  const hubJsonLd = buildMtgCardHubCollectionJsonLd({
    siteOrigin: SITE_ORIGIN,
    cardSlug,
    hubDisplayName: name,
    items: printings.map((p) => ({
      scryfallId: p.scryfallId,
      name: p.name,
      flavorName: p.flavorName,
      finishes: p.finishes ?? [],
      promoTypes: p.promoTypes ?? [],
      frameEffects: p.frameEffects ?? [],
      borderColor: p.borderColor,
    })),
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(hubJsonLd) }}
      />
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">{name}</h1>
        <SearchResultsGrid initialQuery={`"${name}"`} />
      </div>
    </>
  )
}
