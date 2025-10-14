import { simpleMovingAverage, computeDeltas } from '../priceTrends'

describe('priceTrends utils', () => {
  const mkPoints = (arr: number[]) => arr.map((p, i) => ({ t: new Date(2025, 0, i + 1), price: p }))

  it('computes SMA', () => {
    const pts = mkPoints([1,2,3,4,5,6,7])
    const sma = simpleMovingAverage(pts, 3)
    expect(sma.map(p => Number(p.price.toFixed(2)))).toEqual([2,3,4,5,6])
  })

  it('computes deltas', () => {
    const pts = mkPoints([10, 11, 9, 12, 15])
    const d = computeDeltas(pts)
    expect(d.d7).toBeNull()
    expect(d.d30).toBeNull()
    expect(d.d90).toBeNull()
    // 5-day last vs previous day delta
    expect(d.d7).toBeNull()
  })
})


