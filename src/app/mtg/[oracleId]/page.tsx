import CardImage from '@/components/CardImage'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fetchPrintsForOracle, tryWithOracleLock } from '@/lib/scryfallPrints'
import { getScryfallNormalUrl } from '@/lib/images'
import { getPricingConfig, getDisplayPriceServer } from '@/lib/pricingData'
import { formatPriceServer } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs rounded bg-zinc-200 dark:bg-zinc-800 mr-1 mb-1">
      {children}
    </span>
  )
}

export default async function OraclePage(props: { params: Promise<{ oracleId: string }> }) {
  const { oracleId } = await props.params

  const existingCount = await prisma.mtgCard.count({ where: { oracleId, isPaper: true, lang: 'en' } })
  const force = process.env.FORCE_SYNC_PRINTS_ON_VIEW === '1'
  if (force || existingCount < 3) {
    const timeoutMs = Number(process.env.SCRYFALL_SYNC_TIMEOUT_MS || 4000)
    const attempt = tryWithOracleLock(oracleId, () => fetchPrintsForOracle(oracleId))
    await Promise.race([
      attempt,
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ])
  }

  const rows = await prisma.mtgCard.findMany({
    where: { 
      oracleId, 
      isPaper: true, 
      lang: 'en',
      // Only show items that have at least one price available
      OR: [
        { priceUsd: { not: null } },
        { priceUsdFoil: { not: null } },
        { priceUsdEtched: { not: null } }
      ]
    },
    orderBy: [{ releasedAt: 'desc' }, { setCode: 'asc' }, { collectorNumber: 'asc' }],
    select: {
      scryfallId: true,
      name: true,
      setCode: true,
      set: { select: { set_name: true } },
      collectorNumber: true,
      rarity: true,
      frameEffects: true,
      promoTypes: true,
      fullArt: true,
      finishes: true,
      priceUsd: true,
      priceUsdFoil: true,
      priceUsdEtched: true,
    },
  })

  if (rows.length === 0) {
    return (
      <div className="p-6">
        <Link href="/mtg" className="text-sm text-blue-600 hover:underline">← Back</Link>
        <div className="mt-4">No printings found.</div>
      </div>
    )
  }

  const title = rows[0].name
  
  // Get pricing configuration
  const config = await getPricingConfig()

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/mtg" className="text-sm text-blue-600 hover:underline">← Back</Link>
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
            <tr>
              <th className="p-2 text-left">Image</th>
              <th className="p-2 text-left">Set</th>
              <th className="p-2 text-left">Collector #</th>
              <th className="p-2 text-left">Rarity</th>
              <th className="p-2 text-left">Tags</th>
              <th className="p-2 text-left">Finishes</th>
              <th className="p-2 text-right">Normal Price</th>
              <th className="p-2 text-right">Foil Price</th>
              <th className="p-2 text-right">Etched Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tags = [
                ...(row.frameEffects || []),
                ...(row.promoTypes || []),
                ...(row.fullArt ? ['fullart'] : []),
              ]
              const finishes = new Set(row.finishes || [])
              const imageUrl = row.scryfallId ? getScryfallNormalUrl(row.scryfallId) : ''
              return (
                <tr key={row.scryfallId} className="odd:[background:var(--card)] even:[background:color-mix(in_oklab,var(--card)_92%,transparent)] dark:odd:bg-zinc-950 dark:even:bg-zinc-900">
                  <td className="p-2">
                    {imageUrl ? (
                      <CardImage mode="thumb" src={imageUrl} alt={row.name} width={64} />
                    ) : (
                      <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    )}
                  </td>
                  <td className="p-2 align-top">
                    <div className="font-medium">{row.setCode.toUpperCase()}</div>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrow set relation quickly */}
                    <div className="text-xs text-zinc-500">{(row as any).set?.set_name ?? ''}</div>
                  </td>
                  <td className="p-2 align-top">{row.collectorNumber}</td>
                  <td className="p-2 align-top">{row.rarity ?? '—'}</td>
                  <td className="p-2 align-top">
                    {tags.length === 0 ? '—' : tags.map((t) => <Tag key={t}>{t}</Tag>)}
                  </td>
                  <td className="p-2 align-top">
                    {finishes.has('nonfoil') && <Tag>Nonfoil</Tag>}
                    {finishes.has('foil') && <Tag>Foil</Tag>}
                    {finishes.has('etched') && <Tag>Etched</Tag>}
                    {!finishes.size && '—'}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {(() => {
                      const card = { priceUsd: row.priceUsd, priceUsdFoil: row.priceUsdFoil, priceUsdEtched: row.priceUsdEtched }
                      const displayPrice = getDisplayPriceServer(card, config, ['normal'])
                      return displayPrice ? formatPriceServer(displayPrice, config) : '—'
                    })()}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {(() => {
                      const card = { priceUsd: row.priceUsd, priceUsdFoil: row.priceUsdFoil, priceUsdEtched: row.priceUsdEtched }
                      const displayPrice = getDisplayPriceServer(card, config, ['foil'])
                      return displayPrice ? formatPriceServer(displayPrice, config) : '—'
                    })()}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {(() => {
                      const card = { priceUsd: row.priceUsd, priceUsdFoil: row.priceUsdFoil, priceUsdEtched: row.priceUsdEtched }
                      const displayPrice = getDisplayPriceServer(card, config, ['etched'])
                      return displayPrice ? formatPriceServer(displayPrice, config) : '—'
                    })()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {process.env.NODE_ENV !== 'production' && (
        <div>
          <SyncNow oracleId={oracleId} />
        </div>
      )}
    </div>
  )
}

function SyncNow({ oracleId }: { oracleId: string }) {
  return (
    <form
      action={async () => {
        'use server'
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/prints-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oracleId }),
          })
        } catch {}
      }}
    >
      <button className="mt-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm">
        Sync now
      </button>
    </form>
  )
}


