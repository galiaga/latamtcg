import CardImage from '@/components/CardImage'
import TwoSidedImage from '@/components/TwoSidedImage'
import AddToCartButton from '@/components/AddToCartButton'
import Link from 'next/link'
import { getPrintingById } from '@/lib/printings'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import OtherPrintingsCarousel from '@/components/OtherPrintingsCarousel'
import { formatCardVariant } from '@/lib/cards/formatVariant'

export const dynamic = 'force-dynamic'
export const revalidate = 300

function formatUsdWholeCeil(value: unknown | null): string {
  if (value === null || value === undefined) return 'Not available'
  const num = Number(value)
  if (Number.isNaN(num)) return 'Not available'
  return `$${Math.ceil(num)}`
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  try {
    // Prisma Decimal
    if (typeof value === 'object' && value !== null && typeof (value as any).toNumber === 'function') {
      const n = (value as any).toNumber()
      return Number.isFinite(n) ? n : null
    }
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  try {
    if (typeof value === 'object' && value !== null && typeof (value as any).toString === 'function') {
      return (value as any).toString()
    }
    return String(value)
  } catch {
    return null
  }
}

export async function generateMetadata(props: { params: Promise<{ printingId: string }> }) {
  const { printingId } = await props.params
  try {
    const data = await getPrintingById(printingId)
    const variant = formatCardVariant({
      finishes: data.finishes,
      promoTypes: data.promoTypes,
      frameEffects: data.frameEffects,
      borderColor: data.borderColor
    })
    const col = data.collectorNumber ? ` #${data.collectorNumber}` : ''
    const setPart = `${(data.setCode || '').toUpperCase()}${col}`
    const title = `${data.name}${variant.suffix} — ${setPart} | LatamTCG`
    const canonical = `/mtg/printing/${printingId}`
    return { title, alternates: { canonical } }
  } catch {
    return { title: 'Card', alternates: { canonical: `/mtg/printing/${printingId}` } }
  }
}

export default async function PrintingPage(props: { params: Promise<{ printingId: string }> }) {
  const { printingId } = await props.params
  const t0 = Date.now()
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
             c."priceUsd",
             c."priceUsdFoil",
             c."priceUsdEtched",
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
            , b."priceUsd", b."priceUsdFoil", b."priceUsdEtched"
      FROM groups g
      JOIN LATERAL (
        SELECT id, "setCode", "setName", "collectorNumber", "priceUsd", "priceUsdFoil", "priceUsdEtched"
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

  try { console.log(JSON.stringify({ event: 'printing.ms', id: printingId, ms: Date.now() - t0 })) } catch {}
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
          <li aria-current="page">
            {(() => {
              const variant = formatCardVariant({
                finishes: data.finishes,
                promoTypes: data.promoTypes,
                frameEffects: data.frameEffects,
                borderColor: data.borderColor
              })
              return `${data.name}${variant.suffix}`
            })()}
          </li>
        </ol>
      </nav>

      <div className="flex items-start gap-8 flex-col lg:flex-row">
        {/* Left: sticky image column */}
        <div className="self-center lg:self-start lg:sticky lg:top-24 w-[min(86vw,420px)] lg:w-[clamp(320px,28vw,440px)] xl:w-[clamp(360px,30vw,480px)]">
          {data.id ? (
            <TwoSidedImage scryfallId={data.id} alt={data.name} mode="large" className="w-full" />
          ) : (
            <div className="relative aspect-[63/88] w-full rounded-2xl border overflow-hidden skeleton" style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }} />
          )}
          <div className="mt-2 text-xs" style={{ color: 'var(--mutedText)' }}>
            Data & Images © Scryfall
          </div>
        </div>
        {/* Right: details */}
        <div className="flex-1 card card-2xl p-4">
          {(() => {
            const variant = formatCardVariant({
              finishes: data.finishes,
              promoTypes: data.promoTypes,
              frameEffects: data.frameEffects,
              borderColor: data.borderColor
            })
            return (
              <>
                <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.01em' }}>
                  {data.name}{variant.suffix}
                </h1>
                {variant.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variant.tags.map((tag, index) => (
                      <span key={index} className="badge" style={{ background: 'var(--primarySoft)', borderColor: 'transparent', color: 'var(--primary)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="badge">{(data.setCode || '').toUpperCase()}</span>
            {data.setName ? <span className="badge">{data.setName}</span> : null}
            {data.collectorNumber ? <span className="badge">#{data.collectorNumber}</span> : null}
            {data.language && data.language !== 'EN' ? <span className="badge">{data.language.toUpperCase()}</span> : null}
          </div>
          
          {/* Pricing section */}
          <div className="mt-4 space-y-2">
            <h3 className="text-lg font-medium">Pricing</h3>
            <div className="space-y-2">
              {data.hasNonfoil && data.priceUsd && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">Normal</span>
                  <span className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>
                    {formatUsdWholeCeil(data.priceUsd)}
                  </span>
                </div>
              )}
              {data.hasFoil && data.priceUsdFoil && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">Foil</span>
                  <span className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>
                    {formatUsdWholeCeil(data.priceUsdFoil)}
                  </span>
                </div>
              )}
              {data.hasEtched && data.priceUsdEtched && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">Etched</span>
                  <span className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>
                    {formatUsdWholeCeil(data.priceUsdEtched)}
                  </span>
                </div>
              )}
              {!data.hasNonfoil && !data.hasFoil && !data.hasEtched && (
                <div className="p-3 border rounded-lg text-center text-gray-500">
                  No pricing available
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {/* Replace wishlist/track with add to cart for MVP */}
            <AddToCartButton printingId={data.id} size="lg" />
          </div>
        </div>
      </div>

      <OtherPrintingsCarousel
        items={siblings.map((s) => ({
          id: String(s.id),
          name: String(s.name),
          setCode: s.setCode,
          setName: s.setName,
          collectorNumber: toStringOrNull(s.collectorNumber),
          variant_group: s.variant_group,
          finish_group: s.finish_group,
          priceUsd: toNumberOrNull(s.priceUsd) ?? toNumberOrNull(s.priceUsdFoil) ?? toNumberOrNull(s.priceUsdEtched) ?? null,
        }))}
        currentId={String(data.id)}
        oracleId={String(data.oracleId)}
      />
    </div>
  )
}


