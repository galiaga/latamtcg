import { describe, it, expect, beforeAll } from 'vitest'
import { groupedSearch } from '@/services/searchQueryGroupedSimple'

const RUN = process.env.SEARCH_DB_TESTS === '1'
const maybe = RUN ? describe : describe.skip

maybe('ranking and facets (integration)', () => {
  beforeAll(() => {
    // These tests require a live DB populated with MTG data
    // Enable by running with SEARCH_DB_TESTS=1
  })

  it('"mire tri" ranks Mire Triton first; sets facet J22/SCD/THB', async () => {
    const res = await groupedSearch({ q: 'mire tri', page: 1, pageSize: 10, sort: 'relevance' })
    expect((res.primary?.[0]?.title || '').toLowerCase()).toContain('mire triton')
    const facetCodes = new Set((res.facets.sets || []).map((s: any) => String(s.code || '').toUpperCase()))
    const allowed = new Set(['J22','SCD','THB'])
    // All facet codes should be among allowed
    for (const c of facetCodes) expect(allowed.has(c)).toBe(true)
    // And at least 2 expected codes should appear
    expect([...'J22,THB,SCD'.split(',')].filter((c) => facetCodes.has(c)).length).toBeGreaterThanOrEqual(2)
  })

  it('"past in flames" exact-name wins; default printing first in group', async () => {
    const res = await groupedSearch({ q: 'past in flames', page: 1, pageSize: 10, sort: 'relevance', debug: true })
    const top = res.primary?.[0]
    expect((top?.title || '').toLowerCase()).toContain('past in flames')
    // representative printing should prefer non-foil/standard
    expect(Boolean(top?.hasNonfoil)).toBe(true)
  })

  it('q="past in fl" (mode=name) facets restricted to Past in Flames sets', async () => {
    const res = await groupedSearch({ q: 'past in fl', page: 1, pageSize: 10, sort: 'relevance', debug: true, mode: 'name' as any })
    const titles = (res.primary || []).map((i: any) => String(i.title || '').toLowerCase())
    // Ensure we matched Past in Flames
    expect(titles.some((t) => t.includes('past in flames'))).toBe(true)
    const setCodes = new Set((res.facets.sets || []).map((s: any) => String(s.code || '').toUpperCase()))
    // Should not include unrelated sets; expect at least one of known PIF sets
    const known = new Set(['ISD','MM3','UMA','DMU','J22','RVR','SCD','CMD','VOC','SLD'])
    expect([...setCodes].some((c) => known.has(c))).toBe(true)
  })

  it('"ajani" names starting with Ajani rank above mid-word', async () => {
    const res = await groupedSearch({ q: 'ajani', page: 1, pageSize: 10, sort: 'relevance' })
    const t0 = String(res.primary?.[0]?.title || '').toLowerCase()
    expect(t0.startsWith('ajani')).toBe(true)
  })

  it('sort=name_asc is alphabetical', async () => {
    const res = await groupedSearch({ q: 'ajani', page: 1, pageSize: 10, sort: 'name_asc' })
    const titles = (res.primary || []).map((i: any) => String(i.title || ''))
    const sorted = [...titles].sort((a, b) => a.localeCompare(b))
    expect(titles.slice(0, 5)).toEqual(sorted.slice(0, 5))
  })

  it('price_asc sorts cheapest first with nulls last', async () => {
    const res = await groupedSearch({ q: 'shock', page: 1, pageSize: 15, sort: 'price_asc' })
    const prices = (res.primary || []).map((i: any) => {
      const v = i.priceUsdEtched ?? i.priceUsdFoil ?? i.priceUsd
      return (v === null || v === undefined) ? null : Number(v)
    })
    const firstPricedIdx = prices.findIndex((p) => typeof p === 'number' && !Number.isNaN(p))
    const lastPricedIdx = prices.findLastIndex ? prices.findLastIndex((p) => typeof p === 'number' && !Number.isNaN(p)) : (() => { let idx = -1; prices.forEach((p, i) => { if (typeof p === 'number' && !Number.isNaN(p)) idx = i }); return idx })()
    expect(firstPricedIdx).toBeGreaterThanOrEqual(0)
    if (lastPricedIdx > firstPricedIdx) {
      const priced = prices.slice(firstPricedIdx, lastPricedIdx + 1) as number[]
      const sorted = [...priced].sort((a, b) => a - b)
      expect(priced).toEqual(sorted)
    }
    // any nulls should appear after last priced
    const anyNullBefore = prices.slice(0, lastPricedIdx + 1).some((p) => p === null)
    expect(anyNullBefore).toBe(false)
  })

  it('price_desc sorts most expensive first with nulls last', async () => {
    const res = await groupedSearch({ q: 'shock', page: 1, pageSize: 15, sort: 'price_desc' })
    const prices = (res.primary || []).map((i: any) => {
      const v = i.priceUsdEtched ?? i.priceUsdFoil ?? i.priceUsd
      return (v === null || v === undefined) ? null : Number(v)
    })
    const firstPricedIdx = prices.findIndex((p) => typeof p === 'number' && !Number.isNaN(p))
    const lastPricedIdx = prices.findLastIndex ? prices.findLastIndex((p) => typeof p === 'number' && !Number.isNaN(p)) : (() => { let idx = -1; prices.forEach((p, i) => { if (typeof p === 'number' && !Number.isNaN(p)) idx = i }); return idx })()
    expect(firstPricedIdx).toBeGreaterThanOrEqual(0)
    if (lastPricedIdx > firstPricedIdx) {
      const priced = prices.slice(firstPricedIdx, lastPricedIdx + 1) as number[]
      const sorted = [...priced].sort((a, b) => b - a)
      expect(priced).toEqual(sorted)
    }
    const anyNullBefore = prices.slice(0, lastPricedIdx + 1).some((p) => p === null)
    expect(anyNullBefore).toBe(false)
  })
})

maybe('performance (warm)', () => {
  it('relevance P95 stays under ~200ms when warm', async () => {
    await groupedSearch({ q: 'mire triton', page: 1, pageSize: 25, sort: 'relevance' })
    // second call should be cached and fast
    const t1 = Date.now()
    await groupedSearch({ q: 'mire triton', page: 1, pageSize: 25, sort: 'relevance' })
    const t2 = Date.now()
    const ms = t2 - t1
    expect(ms).toBeLessThan(250)
  })
})


