import Link from 'next/link'
import { getPrintingById } from '@/lib/printings'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import OtherPrintingsCarousel from '@/components/OtherPrintingsCarousel'
import { formatCardVariant } from '@/lib/cards/formatVariant'
import { formatDisplayName } from '@/lib/cardNames'
// Gate history chart import behind flag via dynamic import to avoid bundling when disabled
const SHOW_HISTORY = process.env.NEXT_PUBLIC_PRICE_HISTORY_ENABLED === 'true'
const PriceHistoryChart = SHOW_HISTORY ? (await import('@/components/PriceHistoryChart')).default : (null as any)
import { getCurrentPrice } from '@/lib/prices'
import { formatDateTime, formatUsd, formatCLP } from '@/lib/format'
import { getVariantsForCard, resolveInitialVariant } from '@/helpers/pdpVariants'
import { VariantSectionClient } from './VariantSectionClient'
import { CardImageWithShine } from './CardImageWithShine'
import ShareButtons from '@/components/ShareButtons'

export const dynamic = 'force-dynamic'
export const revalidate = 300


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
    
    // Get product name with variant suffix
    const productName = `${formatDisplayName(data.name, data.flavorName)}${variant.suffix}`
    
    // Get initial variant for price in description
    const variants = await getVariantsForCard(data)
    const initialVariant = resolveInitialVariant(variants)
    const priceText = initialVariant.priceClp != null 
      ? formatCLP(initialVariant.priceClp)
      : formatUsd(data.priceUsd)
    
    // Build description with product type and price
    const variantLabel = initialVariant.label || 'Card'
    const setInfo = data.setName || (data.setCode || '').toUpperCase()
    const description = `${variantLabel} Magic: The Gathering card from ${setInfo}. ${productName}. Price: ${priceText}.`
    
    // Build canonical URL
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://latamtcg.com'
    const canonical = `${baseUrl}/mtg/printing/${printingId}`
    
    // Get image URL for OG tags
    const imageUrl = data.imageUrl || ''
    
    // Meta title: "{Product Name} | LatamTCG"
    const title = `${productName} | LatamTCG`
    
    return { 
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: 'LatamTCG',
        images: imageUrl ? [
          {
            url: imageUrl,
            width: 488,
            height: 680,
            alt: productName,
          }
        ] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
      robots: { index: true, follow: true }
    }
  } catch {
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://latamtcg.com'
    const canonical = `${baseUrl}/mtg/printing/${printingId}`
    return { 
      title: 'Card | LatamTCG', 
      description: 'Magic: The Gathering card on LatamTCG',
      alternates: { canonical },
      robots: { index: true, follow: true }
    }
  }
}

export default async function PrintingPage(props: { params: Promise<{ printingId: string }> }) {
  const { printingId } = await props.params
  const t0 = Date.now()
  if (process.env.NODE_ENV !== 'production') console.debug('[printing-page] rendering', printingId)
  const data = await getPrintingById(printingId)

  // Compute variants and resolve initial variant for PriceBlock
  const variants = await getVariantsForCard(data);
  const initialVariant = resolveInitialVariant(variants);

  // Fetch current price to display last update when history is disabled
  const finish: 'nonfoil' | 'foil' | 'etched' = (data.finishes?.includes('nonfoil') ? 'nonfoil' : (data.finishes?.includes('foil') ? 'foil' : 'etched')) as any
  const { price, price_at } = await getCurrentPrice(data.id, finish)

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
             NULL AS "computedPriceClp",
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
            , b."priceUsd", b."priceUsdFoil", b."priceUsdEtched", NULL AS "computedPriceClp"
      FROM groups g
      JOIN LATERAL (
        SELECT id, "setCode", "setName", "collectorNumber", "priceUsd", "priceUsdFoil", "priceUsdEtched", NULL AS "computedPriceClp"
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
    <div className="p-2 md:p-6 space-y-3 md:space-y-6">
      <nav aria-label="breadcrumb" className="text-sm" style={{ color: 'var(--mutedText)' }}>
        {/* Mobile: Compact breadcrumb with ellipsis */}
        <div className="md:hidden">
          <ol className="flex items-center gap-1 text-xs">
            <li><Link className="underline-offset-2 hover:underline" href="/">Home</Link></li>
            <li>›</li>
            <li><Link className="underline-offset-2 hover:underline" href="/mtg/search">MTG</Link></li>
            <li>›</li>
            <li className="truncate">
              <Link 
                className="underline-offset-2 hover:underline" 
                href={`/mtg/search?set=${encodeURIComponent((data.setCode || '').toUpperCase())}`}
                title={data.setName ?? (data.setCode || '').toUpperCase()}
              >
                {data.setName ?? (data.setCode || '').toUpperCase()}
              </Link>
            </li>
            <li>›</li>
            <li aria-current="page" className="truncate font-medium">
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
        </div>
        
        {/* Desktop: Full breadcrumb trail */}
        <ol className="hidden md:flex items-center gap-1">
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
            <CardImageWithShine scryfallId={data.id} alt={data.name} initialVariantId={initialVariant.id} />
          ) : (
            <div className="relative aspect-[63/88] w-full rounded-xl border overflow-hidden skeleton" style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }} />
          )}
          <div className="mt-2 text-xs" style={{ color: 'var(--mutedText)' }}>
            Data & Images © Scryfall
          </div>
          
        </div>
        {/* Right: details */}
        <div className="flex-1 card card-2xl p-4 w-[min(86vw,420px)] md:w-auto md:max-w-none">
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
                  {formatDisplayName(data.name, data.flavorName)}{variant.suffix}
                </h1>
              </>
            )
          })()}
          
          {/* Variant Section - PriceBlock + VariantSelector + Add to Cart */}
          <div className="mt-2">
            <VariantSectionClient
              initialVariantId={initialVariant.id}
              variants={variants}
              printingId={data.id}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="badge">{(data.setCode || '').toUpperCase()}</span>
            {data.setName ? <span className="badge">{data.setName}</span> : null}
            {data.collectorNumber ? <span className="badge">#{data.collectorNumber}</span> : null}
            {data.language && data.language !== 'EN' ? <span className="badge">{data.language.toUpperCase()}</span> : null}
          </div>
          
          {/* Share Buttons */}
          <div className="mt-4">
            {(() => {
              const variant = formatCardVariant({
                finishes: data.finishes,
                promoTypes: data.promoTypes,
                frameEffects: data.frameEffects,
                borderColor: data.borderColor
              })
              const productName = `${formatDisplayName(data.name, data.flavorName)}${variant.suffix}`
              const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://latamtcg.com'
              const productUrl = `${baseUrl}/mtg/printing/${printingId}`
              const variantLabel = initialVariant.label || 'Card'
              const setInfo = data.setName || (data.setCode || '').toUpperCase()
              const priceText = initialVariant.priceClp != null 
                ? formatCLP(initialVariant.priceClp)
                : formatUsd(data.priceUsd)
              const shareDescription = `${variantLabel} Magic: The Gathering card from ${setInfo}. ${productName}. Price: ${priceText}.`
              
              return (
                <ShareButtons
                  title={productName}
                  url={productUrl}
                  description={shareDescription}
                />
              )
            })()}
          </div>
          
          {/* Price: last update line or chart (flagged) */}
          {!SHOW_HISTORY ? (
            price != null ? (
              <p className="mt-4 text-sm" style={{ color: 'var(--mutedText)' }}>
                Last price update: <strong>{formatUsd(price)}</strong>{price_at ? <> — {formatDateTime(price_at)}</> : null}
              </p>
            ) : null
          ) : (
            <div className="mt-6 hidden lg:block">
              {PriceHistoryChart ? <PriceHistoryChart printingId={data.id} days={30} /> : null}
            </div>
          )}
        </div>
      </div>

      {SHOW_HISTORY ? (
        <div className="lg:hidden">
          {PriceHistoryChart ? <PriceHistoryChart printingId={data.id} days={30} /> : null}
        </div>
      ) : null}

      <OtherPrintingsCarousel
        items={siblings
          .map((s) => ({
            id: String(s.id),
            name: String(s.name),
            setCode: s.setCode,
            setName: s.setName,
            collectorNumber: toStringOrNull(s.collectorNumber),
            variant_group: s.variant_group,
            finish_group: s.finish_group,
            priceUsd: toNumberOrNull(s.priceUsd) ?? toNumberOrNull(s.priceUsdFoil) ?? toNumberOrNull(s.priceUsdEtched) ?? null,
            priceUsdFoil: toNumberOrNull(s.priceUsdFoil),
            priceUsdEtched: toNumberOrNull(s.priceUsdEtched),
            computedPriceClp: toNumberOrNull(s.computedPriceClp),
          }))
          .filter(item => item.priceUsd !== null)}
        currentId={String(data.id)}
        oracleId={String(data.oracleId)}
      />
    </div>
  )
}


