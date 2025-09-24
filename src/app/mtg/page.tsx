import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import SearchBox from '@/components/SearchBox'

const PAGE_SIZE = 50

function formatUsd(value: any | null): string {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return `$${num.toFixed(2)}`
}

export const revalidate = 60

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function MtgPage(props: PageProps) {
  const searchParams = await props.searchParams
  const pageParam = (typeof searchParams?.page === 'string'
    ? searchParams.page
    : Array.isArray(searchParams?.page)
    ? searchParams.page[0]
    : '1') || '1'
  const page = Math.max(1, parseInt(pageParam, 10) || 1)
  const skip = (page - 1) * PAGE_SIZE
  const search = (typeof searchParams?.q === 'string'
    ? searchParams.q
    : Array.isArray(searchParams?.q)
    ? searchParams.q[0]
    : '') || ''

  // Distinct by oracleId: get one representative row for each oracle group
  const baseWhere = {
    AND: [
      { isPaper: true },
      { lang: 'en' },
      { imageNormalUrl: { not: null } },
      search ? { name: { contains: search, mode: 'insensitive' as const } } : {},
    ],
  }

  const groups = await prisma.mtgCard.groupBy({
    by: ['oracleId'],
    where: baseWhere as any,
    _count: { oracleId: true },
    orderBy: { oracleId: 'asc' },
    skip,
    take: PAGE_SIZE,
  })

  const oracleIds = groups.map((g) => g.oracleId)
  const [reps, priceAgg] = oracleIds.length
    ? await Promise.all([
        prisma.mtgCard.findMany({
          where: { oracleId: { in: oracleIds } },
          orderBy: [{ releasedAt: 'desc' }, { setCode: 'asc' }, { collectorNumber: 'asc' }],
          distinct: ['oracleId'],
          select: { oracleId: true, name: true, imageNormalUrl: true },
        }),
        prisma.mtgCard.groupBy({
          by: ['oracleId'],
          where: { oracleId: { in: oracleIds } },
          _min: { priceUsd: true, priceUsdFoil: true, priceUsdEtched: true },
          _max: { priceUsd: true, priceUsdFoil: true, priceUsdEtched: true },
        }),
      ])
    : [[], []]

  const repByOracle = new Map(reps.map((r) => [r.oracleId, r]))
  const aggByOracle = new Map(priceAgg.map((a) => [a.oracleId, a]))
  const rows = oracleIds.map((oid) => ({
    oracleId: oid,
    name: repByOracle.get(oid)?.name ?? 'Unknown',
    imageNormalUrl: repByOracle.get(oid)?.imageNormalUrl ?? null,
    count: groups.find((g) => g.oracleId === oid)?._count.oracleId ?? 0,
    agg: aggByOracle.get(oid),
  }))

  const totalPromise = prisma.mtgCard.groupBy({
    by: ['oracleId'],
    where: baseWhere as any,
    _count: { oracleId: true },
  })
  const total = await totalPromise
  const totalCount = total.length

  const hasPrev = page > 1
  const hasNext = skip + rows.length < totalCount
  const filteredRows = rows

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>MTG Catalog</h1>
        <div className="ml-auto">
          <SearchBox />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-md border" style={{ borderColor: 'var(--border)' }}>
          <table className="min-w-full text-sm table">
            <thead>
              <tr>
                <th className="p-2 text-left" style={{ color: 'var(--mutedText)' }}>Image</th>
                <th className="p-2 text-left" style={{ color: 'var(--mutedText)' }}>Name</th>
                <th className="p-2 text-right" style={{ color: 'var(--mutedText)' }}>Printings</th>
                <th className="p-2 text-right" style={{ color: 'var(--mutedText)' }}>Min USD</th>
                <th className="p-2 text-right" style={{ color: 'var(--mutedText)' }}>Max USD</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.oracleId}>
                  <td className="p-2">
                    {row.imageNormalUrl ? (
                      <Image
                        src={row.imageNormalUrl}
                        alt={row.name}
                        width={64}
                        height={64}
                        className="rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    )}
                  </td>
                  <td className="p-2">
                    <Link href={`/mtg/${row.oracleId}`} className="underline-offset-2 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="p-2 text-right">{row.count}</td>
                  <td className="p-2 text-right tabular-nums">{formatUsd(minPrice(row.agg))}</td>
                  <td className="p-2 text-right tabular-nums">{formatUsd(maxPrice(row.agg))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <PaginationButton disabled={!hasPrev} href={`/mtg?page=${page - 1}&q=${encodeURIComponent(search)}`}>
          Prev
        </PaginationButton>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          Page {page} · {totalCount.toLocaleString()} cards
        </div>
        <PaginationButton disabled={!hasNext} href={`/mtg?page=${page + 1}&q=${encodeURIComponent(search)}`}>
          Next
        </PaginationButton>
      </div>
    </div>
  )
}

function PaginationButton({ disabled, href, children }: { disabled?: boolean; href: string; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span className="btn" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className="btn">
      {children}
    </Link>
  )
}

async function hasAnyCards(): Promise<boolean> {
  const count = await prisma.mtgCard.count()
  return count > 0
}

function EmptyState() {
  const dev = process.env.NODE_ENV !== 'production'
  return (
    <div className="p-8 rounded border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-4">
      <p className="text-zinc-700 dark:text-zinc-300">No MTG cards yet. Run the ingest to populate the database.</p>
      {dev ? (
        <DevTriggerButton />
      ) : (
        <p className="text-xs text-zinc-500">In production, trigger the protected job or wait for cron.</p>
      )}
    </div>
  )
}

function DevTriggerButton() {
  async function trigger() {
    try {
      const res = await fetch('/api/jobs/scryfall-refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}`,
        },
      })
      if (!res.ok) alert('Failed to start ingest')
      else alert('Ingest started')
    } catch (e) {
      alert('Error starting ingest')
    }
  }
  return (
    <form action={trigger}>
      <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
        Run ingest now
      </button>
    </form>
  )
}

function minPrice(agg: any | undefined): number | null {
  if (!agg) return null
  const values = [agg._min?.priceUsd, agg._min?.priceUsdFoil, agg._min?.priceUsdEtched]
    .filter((v) => v !== null && v !== undefined)
    .map((v: any) => Number(v))
    .filter((n) => !Number.isNaN(n))
  if (values.length === 0) return null
  return Math.min(...values)
}

function maxPrice(agg: any | undefined): number | null {
  if (!agg) return null
  const values = [agg._max?.priceUsd, agg._max?.priceUsdFoil, agg._max?.priceUsdEtched]
    .filter((v) => v !== null && v !== undefined)
    .map((v: any) => Number(v))
    .filter((n) => !Number.isNaN(n))
  if (values.length === 0) return null
  return Math.max(...values)
}


