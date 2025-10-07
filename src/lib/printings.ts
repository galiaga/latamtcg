import { prisma } from '@/lib/prisma'
import { cache } from 'react'
import { Prisma } from '@prisma/client'
import { getScryfallNormalUrl } from '@/lib/images'
import { fmtCollector } from '@/lib/format'
import { notFound } from 'next/navigation'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function pickFinishLabel(finishes: string[] | null | undefined, promoTypes: string[] | null | undefined): string | null {
  const pt = new Set((promoTypes || []).map((p) => String(p)))
  // Special foils
  if (pt.has('gilded')) return 'Gilded Foil'
  if (pt.has('halo-foil')) return 'Halo Foil'
  if (pt.has('textured')) return 'Textured Foil'
  if (pt.has('step-and-compleat')) return 'Step-and-Compleat'
  if (pt.has('rainbow-foil')) return 'Rainbow Foil'
  const set = new Set((finishes || []).map((f) => String(f)))
  if (set.has('etched')) return 'Foil Etched'
  if (set.has('nonfoil') || set.has('foil')) return 'Standard'
  return null
}

function pickVariant(frameEffects: string[] | null | undefined, promoTypes: string[] | null | undefined, fullArt?: boolean | null): string | null {
  const fe = new Set((frameEffects || []).map((f) => String(f)))
  const pt = new Set((promoTypes || []).map((p) => String(p)))
  if (fe.has('borderless')) return 'Borderless'
  if (fe.has('extendedart')) return 'Extended Art'
  if (fe.has('showcase')) return 'Showcase'
  if (pt.has('retro') || pt.has('retro-frame')) return 'Retro'
  if (fullArt) return 'Borderless'
  return null
}

export const getPrintingById = cache(async function getPrintingByIdCached(printingId: string) {
  if (!UUID_V4.test(printingId)) notFound()
  if (process.env.NODE_ENV !== 'production') console.debug('[getPrintingById] start', printingId)

  try {
    const rows = await prisma.$queryRaw<Array<{
      scryfallId: string
      oracleId: string
      name: string | null
      setCode: string | null
      collectorNumber: string | null
      finishes: string[] | null
      frameEffects: string[] | null
      promoTypes: string[] | null
      fullArt: boolean | null
      priceUsd: any
      priceUsdFoil: any
      priceUsdEtched: any
      lang: string | null
      releasedAt: Date | null
      setName: string | null
      borderColor: string | null
    }>>(
      Prisma.sql`
        SELECT
          c."scryfallId",
          c."oracleId",
          c.name,
          c."setCode",
          c."collectorNumber",
          c.finishes,
          c."frameEffects",
          c."promoTypes",
          c."fullArt",
          c."priceUsd",
          c."priceUsdFoil",
          c."priceUsdEtched",
          c.lang,
          c."releasedAt",
          c."borderColor",
          s.set_name AS "setName"
        FROM "public"."MtgCard" c
        LEFT JOIN "public"."Set" s ON s.set_code = c."setCode"
        WHERE c."scryfallId" = ${printingId}
        LIMIT 1
      `
    )
    const row = rows[0]
    if (!row) notFound()
    // Prefer normalized Set relation; fallback to SearchIndex stored name
    let setName: string | null = row?.setName ?? null
    if (!setName) {
      try {
        const si = await prisma.searchIndex.findUnique({ where: { id: printingId }, select: { setName: true } })
        setName = si?.setName ?? null
      } catch {}
    }

    const finish = pickFinishLabel(row?.finishes || [], row?.promoTypes || [])
    const treatment = pickVariant(row?.frameEffects || [], row?.promoTypes || [], row?.fullArt)
    // Pricing rule: fall back to foil when nonfoil missing; if both missing, allow null (no 404)
    const coalescedPrice = (row?.priceUsd as any) ?? (row?.priceUsdFoil as any) ?? null

    // Determine which finishes are actually available for this printing
    const availableFinishes = row?.finishes || []
    const hasNonfoil = availableFinishes.includes('nonfoil')
    const hasFoil = availableFinishes.includes('foil')
    const hasEtched = availableFinishes.includes('etched')

    const data = {
      id: row.scryfallId,
      name: (row.name ?? '(Unknown name)').replace(/\(Full Art\)/gi, '(Borderless)'),
      setCode: String(row.setCode ?? ''),
      setName: (setName && String(setName).trim()) || null,
      collectorNumber: fmtCollector(row.collectorNumber) ?? '',
      imageUrl: row.scryfallId ? getScryfallNormalUrl(row.scryfallId) : null,
      priceUsd: coalescedPrice,
      priceUsdFoil: row?.priceUsdFoil as any,
      priceUsdEtched: row?.priceUsdEtched as any,
      hasNonfoil,
      hasFoil,
      hasEtched,
      finish: finish,
      treatment: treatment,
      language: (row.lang || 'en').toUpperCase(),
      oracleId: row.oracleId,
      finishes: row?.finishes || [],
      promoTypes: row?.promoTypes || [],
      frameEffects: row?.frameEffects || [],
      borderColor: row?.borderColor || null,
    }
    if (process.env.NODE_ENV !== 'production') console.debug('[getPrintingById] ok', printingId)
    return data
  } catch (e: any) {
    // Avoid noisy logs for expected 404s triggered via notFound()
    const message = String(e?.message || '')
    if (!message.includes('NEXT_NOT_FOUND')) {
      console.error('[getPrintingById] failed', printingId, e)
    }
    throw e
  }
})

export async function findPrintingIdBySetCollector(setCode: string, collectorNumber: string): Promise<string | null> {
  if (!setCode || !collectorNumber) return null
  const set = String(setCode).toLowerCase()
  const cn = String(collectorNumber)
  const row = await prisma.mtgCard.findFirst({ where: { setCode: { equals: set, mode: 'insensitive' }, collectorNumber: cn }, select: { scryfallId: true } })
  if (row?.scryfallId) return row.scryfallId
  // Dev-only: hit Scryfall to resolve id and optionally upsert
  try {
    const res = await fetch(`https://api.scryfall.com/cards/${encodeURIComponent(set)}/${encodeURIComponent(cn)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const card: any = await res.json()
    const id = String(card?.id || '')
    if (!UUID_V4.test(id)) return null
    // best-effort upsert minimal row so the page has data immediately
    await prisma.mtgCard.upsert({
      where: { scryfallId: id },
      create: {
        scryfallId: id,
        oracleId: String(card?.oracle_id ?? ''),
        name: String(card?.name ?? ''),
        setCode: String(card?.set ?? set),
        collectorNumber: String(card?.collector_number ?? cn),
        finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
        frameEffects: Array.isArray(card?.frame_effects) ? card.frame_effects.map((f: any) => String(f)) : [],
        promoTypes: Array.isArray(card?.promo_types) ? card.promo_types.map((p: any) => String(p)) : [],
        fullArt: Boolean(card?.full_art ?? false),
        lang: String(card?.lang ?? 'en'),
        isPaper: !card?.digital,
        releasedAt: card?.released_at ? new Date(card.released_at) : null,
      },
      update: {
        oracleId: String(card?.oracle_id ?? ''),
        name: String(card?.name ?? ''),
        setCode: String(card?.set ?? set),
        collectorNumber: String(card?.collector_number ?? cn),
        finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
        frameEffects: Array.isArray(card?.frame_effects) ? card.frame_effects.map((f: any) => String(f)) : [],
        promoTypes: Array.isArray(card?.promo_types) ? card.promo_types.map((p: any) => String(p)) : [],
        fullArt: Boolean(card?.full_art ?? false),
        lang: String(card?.lang ?? 'en'),
        isPaper: !card?.digital,
        releasedAt: card?.released_at ? new Date(card.released_at) : null,
      },
    })
    return id
  } catch {
    return null
  }
}


