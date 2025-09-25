import { NextRequest, NextResponse } from 'next/server'
import { groupedSearch } from '@/services/searchQueryGrouped'

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

    const t0 = Date.now()
    const result = await groupedSearch({ q, page, pageSize, exactOnly })
    const t1 = Date.now()
    try {
      console.log(JSON.stringify({
        event: 'search', q, page, pageSize,
        returned: Array.isArray((result as any)?.primary) ? (result as any).primary.length : 0,
        total: (result as any)?.totalResults ?? 0,
        exactOnly,
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


