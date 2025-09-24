import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { printingHref } from '@/lib/routes'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ cardSlug: string }> }) {
  const { cardSlug } = await props.params
  return { title: `${decodeURIComponent(cardSlug)} — All printings | LatamTCG` }
}

export default async function CardPage(props: { params: Promise<{ cardSlug: string }> }) {
  const { cardSlug } = await props.params
  const name = decodeURIComponent(cardSlug).replace(/-/g, ' ')
  const reps = await prisma.mtgCard.findMany({
    where: { name: { equals: name, mode: 'insensitive' }, isPaper: true },
    orderBy: [{ releasedAt: 'desc' }, { setCode: 'asc' }, { collectorNumber: 'asc' }],
    select: { scryfallId: true, setCode: true, setName: true, collectorNumber: true },
    take: 200,
  })
  if (reps.length === 0) return notFound()

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">{name}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {reps.map((r) => (
          <Link key={r.scryfallId} href={printingHref(r.scryfallId)} className="card p-3 hover:opacity-90">
            <div className="font-medium truncate">{name}</div>
            <div className="text-xs" style={{ color: 'var(--mutedText)' }}>{(r.setCode || '').toUpperCase()} • {r.setName ?? ''} • #{r.collectorNumber}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}


