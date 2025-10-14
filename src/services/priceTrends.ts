import { prisma } from '@/lib/prisma'

export async function fetchPriceHistory(scryfallId: string, days: number, finish: 'normal' | 'foil' | 'etched') {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)
  const rows = await prisma.$queryRaw<{ t: Date, price: number }[]>`
    SELECT date_trunc('day', price_at) AS t,
           MAX(price) AS price
    FROM mtgcard_price_history
    WHERE scryfall_id = ${scryfallId}::uuid
      AND finish = ${finish}
      AND price_at >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `
  return rows.map(r => ({ t: r.t, price: Number(r.price) }))
}

export function simpleMovingAverage(points: Array<{ t: Date, price: number }>, window: number) {
  const out: Array<{ t: Date, price: number }> = []
  let sum = 0
  const q: number[] = []
  for (const p of points) {
    sum += p.price
    q.push(p.price)
    if (q.length > window) sum -= q.shift() as number
    if (q.length === window) out.push({ t: p.t, price: sum / window })
  }
  return out
}

export function computeDeltas(points: Array<{ t: Date, price: number }>) {
  if (points.length === 0) return { d7: null, d30: null, d90: null }
  const last = points[points.length - 1].price
  const pick = (days: number) => {
    const idx = points.length - 1 - Math.min(points.length - 1, days)
    const base = points[idx]?.price
    return base != null ? last - base : null
  }
  return { d7: pick(7), d30: pick(30), d90: pick(90) }
}


