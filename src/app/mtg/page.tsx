import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'

const PAGE_SIZE = 50

function formatUsd(value: any | null): string {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return `$${num.toFixed(2)}`
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function MtgPage({ searchParams }: PageProps) {
  const pageParam = (searchParams?.page as string) || '1'
  const page = Math.max(1, parseInt(pageParam, 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [rows, total] = await Promise.all([
    prisma.mtgCard.findMany({
      where: { imageNormalUrl: { not: null } },
      orderBy: { name: 'asc' },
      skip,
      take: PAGE_SIZE,
      select: {
        scryfallId: true,
        name: true,
        setCode: true,
        imageNormalUrl: true,
        priceUsd: true,
        priceUsdFoil: true,
      },
    }),
    prisma.mtgCard.count({ where: { imageNormalUrl: { not: null } } }),
  ])

  const hasPrev = page > 1
  const hasNext = skip + rows.length < total

  const search = (searchParams?.q as string) || ''
  const filteredRows = search
    ? rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : rows

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">MTG Catalog</h1>
        <form className="ml-auto" action="/mtg" method="get">
          <input
            type="hidden"
            name="page"
            value={String(page)}
          />
          <input
            className="px-3 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
            placeholder="Search name..."
            name="q"
            defaultValue={search}
          />
        </form>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
              <tr>
                <th className="p-2 text-left">Image</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Set</th>
                <th className="p-2 text-right">Normal USD</th>
                <th className="p-2 text-right">Foil USD</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((card) => (
                <tr key={card.scryfallId} className="odd:bg-white even:bg-zinc-50/50 dark:odd:bg-zinc-950 dark:even:bg-zinc-900">
                  <td className="p-2">
                    {card.imageNormalUrl ? (
                      <Image
                        src={card.imageNormalUrl}
                        alt={card.name}
                        width={64}
                        height={64}
                        className="rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    )}
                  </td>
                  <td className="p-2">{card.name}</td>
                  <td className="p-2">{card.setCode.toUpperCase()}</td>
                  <td className="p-2 text-right tabular-nums">{formatUsd(card.priceUsd)}</td>
                  <td className="p-2 text-right tabular-nums">{formatUsd(card.priceUsdFoil)}</td>
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
          Page {page} · {total.toLocaleString()} cards
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
      <span className="px-3 py-2 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-400 cursor-not-allowed">
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className="px-3 py-2 rounded-md bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700">
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


