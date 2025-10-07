import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SearchResultsGrid from '@/components/SearchResultsGrid'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ cardSlug: string }> }) {
  const { cardSlug } = await props.params
  const name = decodeURIComponent(cardSlug).replace(/-/g, ' ')
  return { title: `${name} — All printings | LatamTCG` }
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


