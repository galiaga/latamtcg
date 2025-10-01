import { NextRequest, NextResponse } from 'next/server'
import { rebuildSearchIndex } from '@/services/searchIndex'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const expected = process.env.CRON_SECRET
    if (!isDev && (!expected || !token || token !== expected)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await rebuildSearchIndex()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[searchindex-refresh] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


