import CardImage from '@/components/CardImage'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPrintingById } from '@/lib/printings'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function formatUsd(value: any | null): string {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return `$${num.toFixed(2)}`
}

export async function generateMetadata(props: { params: Promise<{ printingId: string }> }) {
  const { printingId } = await props.params
  try {
    const data = await getPrintingById(printingId)
    const variant = [data.treatment, data.finish].filter(Boolean).join(' ')
    const col = data.collectorNumber ? ` #${data.collectorNumber}` : ''
    const setPart = `${(data.setCode || '').toUpperCase()}${col}`
    const title = `${data.name}${variant ? ' ' + variant : ''} — ${setPart} | LatamTCG`
    const canonical = `/mtg/printing/${printingId}`
    return { title, alternates: { canonical } }
  } catch {
    return { title: 'Card', alternates: { canonical: `/mtg/printing/${printingId}` } }
  }
}

export default async function PrintingPage(props: { params: Promise<{ printingId: string }> }) {
  const { printingId } = await props.params
  if (process.env.NODE_ENV !== 'production') console.debug('[printing-page] rendering', printingId)
  const data = await getPrintingById(printingId)

  const siblings = await prisma.mtgCard.findMany({
    where: { oracleId: data.oracleId, isPaper: true },
    orderBy: [{ releasedAt: 'desc' }, { setCode: 'asc' }, { collectorNumber: 'asc' }],
    select: { scryfallId: true, name: true, setCode: true, setName: true, collectorNumber: true },
    take: 30,
  })

  return (
    <div className="p-6 space-y-6">
      <nav aria-label="breadcrumb" className="text-sm" style={{ color: 'var(--mutedText)' }}>
        <ol className="flex items-center gap-1 flex-wrap">
          <li><a className="underline-offset-2 hover:underline" href="/">Home</a></li>
          <li>›</li>
          <li><a className="underline-offset-2 hover:underline" href="/mtg/search">MTG</a></li>
          <li>›</li>
          <li><a className="underline-offset-2 hover:underline" href={`/mtg/search?q=${encodeURIComponent((data.setCode || '').toUpperCase())}`}>{(data.setCode || '').toUpperCase()}</a></li>
          <li>›</li>
          <li><a className="underline-offset-2 hover:underline" href={`/mtg/card/${encodeURIComponent(data.name.toLowerCase().replace(/\s+/g, '-'))}`}>{data.name}</a></li>
          {data.treatment || data.finish ? (
            <>
              <li>›</li>
              <li>{[data.treatment, data.finish].filter(Boolean).join(' ')}</li>
            </>
          ) : null}
        </ol>
      </nav>

      <div className="flex items-start gap-6 flex-col md:flex-row">
        <div className="w-full md:w-auto">
          {data.imageUrl ? (
            <CardImage mode="large" src={data.imageUrl} alt={data.name} priority />
          ) : (
            <div className="relative aspect-[3/4] w-full max-w-[680px] skeleton" />
          )}
          <div className="mt-2 text-xs" style={{ color: 'var(--mutedText)' }}>
            Data & Images © Scryfall
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="badge">{(data.setCode || '').toUpperCase()}</span>
            {data.setName ? <span className="badge">{data.setName}</span> : null}
            {data.collectorNumber ? <span className="badge">#{data.collectorNumber}</span> : null}
            {data.language && data.language !== 'EN' ? <span className="badge">{data.language.toUpperCase()}</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.finish ? <span className="badge">{data.finish}</span> : null}
            {data.treatment ? <span className="badge">{data.treatment}</span> : null}
          </div>
          <div className="mt-4 text-xl">
            Price: {formatUsd(data.priceUsd) || '—'}
          </div>
          <div className="mt-4">
            <button className="btn-primary btn" disabled>Condition: NM (stub)</button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">See other printings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {siblings.filter((s) => s.scryfallId !== data.id).map((s) => (
            <Link key={s.scryfallId} href={`/mtg/printing/${s.scryfallId}`} className="card p-3 hover:opacity-90">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-xs" style={{ color: 'var(--mutedText)' }}>{s.setName ?? (s.setCode || '').toUpperCase()} • #{s.collectorNumber}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}


