import { NextRequest, NextResponse } from 'next/server'
import { groupedSearch } from '@/services/searchQueryGrouped'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = String(searchParams.get('q') || '')
    const page = parseInt(String(searchParams.get('page') || '1'), 10) || 1
    const pageSize = Math.min(24, Math.max(1, parseInt(String(searchParams.get('limit') || '24'), 10) || 24))
    const exactOnly = String(searchParams.get('exact') || '') === '1'

    const result = await groupedSearch({ q, page, pageSize, exactOnly })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[search] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


