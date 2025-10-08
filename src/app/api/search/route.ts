import { NextRequest, NextResponse } from 'next/server'
import { groupedSearch } from '@/services/searchQueryGroupedSimple'
import { cacheGetJSON, cacheSetJSON, buildCacheKey } from '@/lib/cache'
import { parseSortParam } from '@/search/sort'
import { recordMetric } from '@/app/api/health/route'
import type { SearchApiResponse } from '@/types/search'
import { SearchParamsSchema, SearchResponseSchema } from '@/schemas/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Parse and validate search parameters using Zod
    const rawParams = {
      q: searchParams.get('q'),
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      limit: searchParams.get('limit'),
      exact: searchParams.get('exact'),
      facetAll: searchParams.get('facetAll'),
      sort: searchParams.get('sort'),
      mode: searchParams.get('mode'),
      debug: searchParams.get('debug'),
      printing: searchParams.getAll('printing'),
      sets: searchParams.getAll('set'),
      rarity: searchParams.getAll('rarity'),
      groupId: searchParams.get('groupId'),
    }
    
    // Zod validation temporarily disabled - working with manual parsing
    // const validatedParams = SearchParamsSchema.parse(rawParams)
    
    const q = String(searchParams.get('q') || '')
    const page = parseInt(String(searchParams.get('page') || '1'), 10) || 1
    const requested = parseInt(String(searchParams.get('pageSize') || searchParams.get('limit') || '25'), 10) || 25
    const pageSize = Math.min(25, Math.max(1, requested))
    const exact = String(searchParams.get('exact') || '')
    const facetAll = String(searchParams.get('facetAll') || '')
    const sort = String(searchParams.get('sort') || 'relevance')
    const mode = (() => {
      const m = String(searchParams.get('mode') || 'name')
      return m === 'text' || m === 'all' ? m : 'name'
    })() as 'name' | 'text' | 'all'
    const debug = String(searchParams.get('debug') || '')
    const printing = (searchParams.getAll('printing') || [])
      .map((v) => String(v).toLowerCase())
      .filter((v) => v === 'normal' || v === 'foil' || v === 'etched') as Array<'normal' | 'foil' | 'etched'>
    const sets = (searchParams.getAll('set') || []).map((s) => String(s).trim()).filter(Boolean)
    const rarity = (searchParams.getAll('rarity') || [])
      .map((v) => String(v).toLowerCase())
      .filter((v) => v === 'common' || v === 'uncommon' || v === 'rare' || v === 'mythic') as Array<'common' | 'uncommon' | 'rare' | 'mythic'>
    const groupId = (() => {
      const g = String(searchParams.get('groupId') || '').trim()
      return g.length ? g : null
    })()
    const showUnavailable = String(searchParams.get('showUnavailable') || '') === 'true'
    const exactOnly = exact === '1'
    const facetAllBool = facetAll === '1'
    const debugBool = debug === '1'
    const sortParam = parseSortParam(sort)
    const groupIdOrNull = groupId || null

    const key = buildCacheKey({ q, page, pageSize, exactOnly, printing, sets, rarity, groupIdOrNull, facetAllBool, sort, mode, showUnavailable })
    const ttl = 300
    const t0 = Date.now()
    try {
      const cached = await cacheGetJSON<SearchApiResponse>(key)
      if (cached) {
        try { console.log(JSON.stringify({ event: 'search.cache_hit', keyLen: key.length })) } catch {}
        return NextResponse.json(cached)
      }
    } catch {}
    const result = await groupedSearch({ q, page, pageSize, exactOnly, printing, sets, rarity, groupId: groupIdOrNull, facetAll: facetAllBool, sort: sortParam, debug: debugBool, mode, showUnavailable })
    const t1 = Date.now()
    try {
      console.log(JSON.stringify({
        event: 'search', q, page, pageSize,
        returned: Array.isArray(result?.primary) ? result.primary.length : 0,
        total: result?.totalResults ?? 0,
        exactOnly,
        filters: { printing, sets, rarity, groupId, sort, mode },
        facets: result?.facets || undefined,
        latencyMs: t1 - t0,
        warn: (t1 - t0) > 700 ? 'slow' : undefined,
      }))
    } catch {}
    cacheSetJSON(key, result, ttl).catch(() => {})
    recordMetric('/api/search', Date.now() - t0)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=240' } })
  } catch (err) {
    console.error('[search] failed', err)
    recordMetric('/api/search', Date.now() - t0, true)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


