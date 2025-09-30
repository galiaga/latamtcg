import { NextRequest, NextResponse } from 'next/server'
import { groupedSearch } from '@/services/searchQueryGrouped'
import { parseSortParam } from '@/search/sort'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = String(searchParams.get('q') || '')
    const page = parseInt(String(searchParams.get('page') || '1'), 10) || 1
    const requested = parseInt(String(searchParams.get('pageSize') || searchParams.get('limit') || '25'), 10) || 25
    const pageSize = Math.min(25, Math.max(1, requested))
    const exactOnly = String(searchParams.get('exact') || '') === '1'
    const facetAll = String(searchParams.get('facetAll') || '') === '1'
    const sort = parseSortParam(String(searchParams.get('sort') || 'relevance'))
    const debug = String(searchParams.get('debug') || '') === '1'
    const modeRaw = String(searchParams.get('mode') || 'name').toLowerCase()
    const mode = (modeRaw === 'text' || modeRaw === 'all' || modeRaw === 'name') ? modeRaw as any : 'name'
    const explain = String(searchParams.get('explain') || '') === '1'
    // filters
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

    const t0 = Date.now()
    const result = await groupedSearch({ q, page, pageSize, exactOnly, printing, sets, rarity, groupId, facetAll, sort, debug, mode })
    const t1 = Date.now()
    try {
      console.log(JSON.stringify({
        event: 'search', q, page, pageSize,
        returned: Array.isArray((result as any)?.primary) ? (result as any).primary.length : 0,
        total: (result as any)?.totalResults ?? 0,
        exactOnly,
        filters: { printing, sets, rarity, groupId, sort, mode },
        facets: (result as any)?.facets || undefined,
        latencyMs: t1 - t0,
        warn: (t1 - t0) > 700 ? 'slow' : undefined,
      }))
    } catch {}
    return NextResponse.json(result)
  } catch (err) {
    console.error('[search] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


