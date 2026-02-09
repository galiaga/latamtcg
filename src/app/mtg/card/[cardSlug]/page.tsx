import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SearchResultsGrid from '@/components/SearchResultsGrid'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ cardSlug: string }> }): Promise<Metadata> {
  const { cardSlug } = await props.params
  const name = decodeURIComponent(cardSlug).replace(/-/g, ' ')
  // Canonical URL uses the cardSlug as-is (Next.js handles URL encoding)
  const canonical = `https://latamtcg.com/mtg/card/${cardSlug}`
  
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

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">{name}</h1>
      <SearchResultsGrid initialQuery={`"${name}"`} />
    </div>
  )
}


