import CardImage from '@/components/CardImage'
import Link from 'next/link'
import { getPrintingById } from '@/lib/printings'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

function formatUsdWholeCeil(value: unknown | null): string {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return `$${Math.ceil(num)}`
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

  // Group siblings by (variant, finishGroup) where finishGroup collapses Standard (nonfoil+foil)
  const siblings = await prisma.$queryRaw<any[]>(Prisma.sql`
    WITH base AS (
      SELECT c."scryfallId" AS id,
             c.name,
             c."oracleId",
             c."setCode",
             COALESCE(s.set_name, '') AS "setName",
             c."collectorNumber",
             c."releasedAt",
             si."variantLabel" AS variant_label,
             si."finishLabel" AS finish_label
      FROM "public"."MtgCard" c
      LEFT JOIN "public"."Set" s ON s.set_code = c."setCode"
      LEFT JOIN "public"."SearchIndex" si ON si.id = c."scryfallId"
      WHERE c."oracleId" = ${data.oracleId} AND c."isPaper" = true AND c.lang = 'en'
        AND (c."priceUsd" IS NOT NULL OR c."priceUsdFoil" IS NOT NULL)
    ), base2 AS (
      SELECT *,
             COALESCE(variant_label, '') AS variant_group,
             CASE
               WHEN finish_label IN ('Standard', 'Nonfoil', 'Foil', '') THEN 'Standard'
               ELSE COALESCE(finish_label, '')
             END AS finish_group
      FROM base
    ), groups AS (
      SELECT "oracleId",
             "setCode",
             "collectorNumber",
             variant_group,
             finish_group,
             MAX("releasedAt") AS rel,
             MIN(name) AS name
      FROM base2
      GROUP BY "oracleId", "setCode", "collectorNumber", variant_group, finish_group
    ), top AS (
      SELECT g.*, b.id, b."setCode", b."setName", b."collectorNumber"
      FROM groups g
      JOIN LATERAL (
        SELECT id, "setCode", "setName", "collectorNumber"
        FROM base2 b
        WHERE b."oracleId" = g."oracleId" AND b."setCode" = g."setCode" AND b."collectorNumber" = g."collectorNumber" AND b.variant_group = g.variant_group AND b.finish_group = g.finish_group
        ORDER BY b."releasedAt" DESC
        LIMIT 1
      ) b ON TRUE
      ORDER BY rel DESC, name ASC
      LIMIT 30
    )
    SELECT * FROM top
  `)

  return (
    <div className="p-6 space-y-6">
      <nav aria-label="breadcrumb" className="text-sm" style={{ color: 'var(--mutedText)' }}>
        <ol className="flex items-center gap-1 flex-wrap">
          <li><Link className="underline-offset-2 hover:underline" href="/">Home</Link></li>
          <li>›</li>
          <li><Link className="underline-offset-2 hover:underline" href="/mtg/search">Magic: The Gathering</Link></li>
          
          <li>›</li>
          <li><Link className="underline-offset-2 hover:underline" href={`/mtg/search?set=${encodeURIComponent((data.setCode || '').toUpperCase())}`}>{data.setName ?? (data.setCode || '').toUpperCase()}</Link></li>
          <li>›</li>
          <li aria-current="page">{data.name}</li>
        </ol>
      </nav>

      <div className="flex items-start gap-8 flex-col lg:flex-row">
        {/* Left: sticky image column */}
        <div className="self-center lg:self-start lg:sticky lg:top-24 w-[min(86vw,420px)] lg:w-[clamp(320px,28vw,440px)] xl:w-[clamp(360px,30vw,480px)]">
          {data.imageUrl ? (
            <CardImage
              mode="large"
              src={data.imageUrl}
              alt={data.name}
              priority
              className="w-full"
            />
          ) : (
            <div className="relative aspect-[63/88] w-full rounded-2xl border border-black/5 dark:border-white/10 shadow-xl bg-white dark:bg-neutral-900 overflow-hidden skeleton" />
          )}
          <div className="mt-2 text-xs" style={{ color: 'var(--mutedText)' }}>
            Data & Images © Scryfall
          </div>
        </div>
        {/* Right: details */}
        <div className="flex-1 card card-2xl p-4">
          <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.01em' }}>{data.name}</h1>
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
          <div className="mt-4 text-xl" style={{ color: 'var(--primary)' }}>
            {formatUsdWholeCeil(data.priceUsd)}
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-gradient btn transition-soft">Add to Wishlist</button>
            <button className="btn transition-soft" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>Track Price</button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">See other printings</h2>
        <div className="flex overflow-x-auto gap-3 py-2">
          {siblings.filter((s) => s.id !== data.id).map((s) => (
            <Link key={`${s.id}-${s.variant_group}-${s.finish_group}`} href={`/mtg/printing/${s.id}`} className="card card-2xl p-3 min-w-[220px] hover-glow-purple transition-soft">
              <div className="font-medium truncate">
                {(() => {
                  const parts: string[] = []
                  if (s.variant_group) parts.push(s.variant_group)
                  if (s.finish_group && s.finish_group !== 'Standard') parts.push(s.finish_group)
                  return parts.length ? `${s.name} (${parts.join(', ')})` : s.name
                })()}
              </div>
              <div className="text-xs" style={{ color: 'var(--mutedText)' }}>
                {s.setName ?? (s.setCode || '').toUpperCase()} {s.collectorNumber ? `• #${s.collectorNumber}` : ''}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}


