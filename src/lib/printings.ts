import { prisma } from '@/lib/prisma'
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

export async function getPrintingById(printingId: string) {
  if (!UUID_V4.test(printingId)) notFound()
  if (process.env.NODE_ENV !== 'production') console.debug('[getPrintingById] start', printingId)

  try {
    const row = await prisma.mtgCard.findUnique({
      where: { scryfallId: printingId },
      select: {
        scryfallId: true,
        oracleId: true,
        name: true,
        setCode: true,
        setName: true,
        collectorNumber: true,
        finishes: true,
        frameEffects: true,
        promoTypes: true,
        fullArt: true,
        imageNormalUrl: true,
        priceUsd: true,
        priceUsdFoil: true,
        priceUsdEtched: true,
        lang: true,
        releasedAt: true,
      },
    })
    if (!row) notFound()

    const finish = pickFinishLabel(row?.finishes, row?.promoTypes)
    const treatment = pickVariant(row?.frameEffects, row?.promoTypes, row?.fullArt)
    // Pricing rule: fall back to foil when nonfoil missing; if both missing, don't show
    const coalescedPrice = (row?.priceUsd as any) ?? (row?.priceUsdFoil as any) ?? null
    if (coalescedPrice === null) notFound()

    const data = {
      id: row!.scryfallId,
      name: (row!.name ?? '(Unknown name)').replace(/\(Full Art\)/gi, '(Borderless)'),
      setCode: String(row!.setCode ?? ''),
      setName: row!.setName ?? '',
      collectorNumber: fmtCollector(row!.collectorNumber) ?? '',
      imageUrl: row!.imageNormalUrl ?? null,
      priceUsd: coalescedPrice,
      finish: finish,
      treatment: treatment,
      language: (row!.lang || 'en').toUpperCase(),
      oracleId: row!.oracleId,
    }
    if (process.env.NODE_ENV !== 'production') console.debug('[getPrintingById] ok', printingId)
    return data
  } catch (e) {
    console.error('[getPrintingById] failed', printingId, e)
    throw e
  }
}

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
    const imageNormal = card?.image_uris?.normal || (Array.isArray(card?.card_faces) ? card.card_faces[0]?.image_uris?.normal : null)
    await prisma.mtgCard.upsert({
      where: { scryfallId: id },
      create: {
        scryfallId: id,
        oracleId: String(card?.oracle_id ?? ''),
        name: String(card?.name ?? ''),
        setCode: String(card?.set ?? set),
        setName: card?.set_name ? String(card.set_name) : null,
        collectorNumber: String(card?.collector_number ?? cn),
        finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
        frameEffects: Array.isArray(card?.frame_effects) ? card.frame_effects.map((f: any) => String(f)) : [],
        promoTypes: Array.isArray(card?.promo_types) ? card.promo_types.map((p: any) => String(p)) : [],
        fullArt: Boolean(card?.full_art ?? false),
        imageNormalUrl: imageNormal ?? null,
        lang: String(card?.lang ?? 'en'),
        isPaper: !card?.digital,
        releasedAt: card?.released_at ? new Date(card.released_at) : null,
      },
      update: {
        oracleId: String(card?.oracle_id ?? ''),
        name: String(card?.name ?? ''),
        setCode: String(card?.set ?? set),
        setName: card?.set_name ? String(card.set_name) : null,
        collectorNumber: String(card?.collector_number ?? cn),
        finishes: Array.isArray(card?.finishes) ? card.finishes.map((f: any) => String(f)) : [],
        frameEffects: Array.isArray(card?.frame_effects) ? card.frame_effects.map((f: any) => String(f)) : [],
        promoTypes: Array.isArray(card?.promo_types) ? card.promo_types.map((p: any) => String(p)) : [],
        fullArt: Boolean(card?.full_art ?? false),
        imageNormalUrl: imageNormal ?? null,
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


