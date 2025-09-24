import { NextRequest, NextResponse } from 'next/server'
import { fetchPrintsForOracle } from '@/lib/scryfallPrints'

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

    const body = await req.json().catch(() => ({}))
    const oracleId = String(body?.oracleId || '')
    if (!oracleId) {
      return NextResponse.json({ error: 'oracleId required' }, { status: 400 })
    }

    const result = await fetchPrintsForOracle(oracleId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[prints-sync] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}



