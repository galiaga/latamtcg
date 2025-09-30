import { prisma } from '@/lib/prisma'
import { getScryfallNormalUrl } from '@/lib/images'
import { Prisma } from '@prisma/client'
import { SearchDoc } from '@/search/types'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function main() {
  const started = Date.now()
  const rows = await prisma.mtgCard.findMany({
    where: { isPaper: true },
    select: {
      scryfallId: true,
      oracleId: true,
      name: true,
      setCode: true,
      // set relation omitted for compatibility with current Prisma schema state
      collectorNumber: true,
      finishes: true,
      frameEffects: true,
      promoTypes: true,
      fullArt: true,
      lang: true,
      priceUsd: true,
    },
    take: 200000,
  })

  let total = 0
  let indexed = 0
  let skipped = 0

  const docs: SearchDoc[] = []
  for (const r of rows) {
    total++
    if (!r.scryfallId || !UUID_V4.test(r.scryfallId)) { skipped++; continue }
    const finish = pickFinish(r.finishes, r.promoTypes)
    const variant = pickVariant(r.frameEffects, r.promoTypes, r.fullArt)
    docs.push({
      id: r.scryfallId,
      groupId: r.oracleId,
      game: 'mtg',
      name: r.name,
      setCode: r.setCode,
      setName: null,
      collectorNumber: r.collectorNumber,
      finishLabel: finish,
      variantLabel: variant,
      lang: r.lang,
      imageThumbUrl: r.scryfallId ? getScryfallNormalUrl(r.scryfallId) : null,
      priceUsd: r.priceUsd ? Number(r.priceUsd) : null,
    })
    indexed++
  }

  // Rebuild SearchIndex table to guarantee id is present
  await prisma.searchIndex.deleteMany({})
  const chunks = chunk(docs, 1000)
  let inserted = 0
  for (const ch of chunks) {
    const res = await prisma.searchIndex.createMany({
      data: ch.map((d) => ({
        id: d.id,
        groupId: d.groupId,
        game: d.game,
        title: d.name,
        subtitle: `${d.setCode.toUpperCase()} • ${d.setName ?? ''} • #${d.collectorNumber}`,
        keywordsText: buildKeywords(d),
        finishLabel: d.finishLabel ?? null,
        variantLabel: d.variantLabel ?? null,
        lang: d.lang,
        isPaper: true,
        releasedAt: null,
        sortScore: null,
        setCode: d.setCode,
        setName: d.setName ?? null,
        collectorNumber: d.collectorNumber,
        imageNormalUrl: d.imageThumbUrl ?? null,
        name: d.name,
      })),
      skipDuplicates: true,
    })
    inserted += res.count
  }

  const ms = Date.now() - started
  console.log('[reindex] done', { total, indexed, skipped, inserted, durationMs: ms })
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function pickFinish(finishes: string[] | null | undefined, promoTypes: string[] | null | undefined): string | null {
  const pt = new Set((promoTypes || []).map((p) => String(p)))
  if (pt.has('rainbow-foil')) return 'Rainbow Foil'
  const set = new Set((finishes || []).map((f) => String(f)))
  if (set.has('nonfoil')) return 'Nonfoil'
  if (set.has('foil')) return 'Foil'
  if (set.has('etched')) return 'Etched'
  return null
}

function pickVariant(frameEffects: string[] | null | undefined, promoTypes: string[] | null | undefined, fullArt?: boolean | null): string | null {
  const fe = new Set((frameEffects || []).map((f) => String(f)))
  const pt = new Set((promoTypes || []).map((p) => String(p)))
  if (fe.has('borderless')) return 'Borderless'
  if (fe.has('extendedart')) return 'Extended Art'
  if (fe.has('showcase')) return 'Showcase'
  if (pt.has('retro') || pt.has('retro-frame')) return 'Retro'
  if (fullArt) return 'Full Art'
  return null
}

function buildKeywords(d: SearchDoc): string {
  const parts = [d.name, d.setCode, d.setName ?? '', d.collectorNumber, d.finishLabel ?? '', d.variantLabel ?? '']
  return parts.map((p) => String(p).toLowerCase()).join(' ')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


