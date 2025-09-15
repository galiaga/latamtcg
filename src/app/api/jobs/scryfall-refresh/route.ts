import { NextRequest, NextResponse } from 'next/server'
import { runScryfallRefresh } from '@/services/scryfallIngest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const expected = process.env.CRON_SECRET
    if (!expected || !token || token !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await runScryfallRefresh()
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[scryfall] Job failed', err)
    return NextResponse.json({ error: 'Job failed' }, { status: 500 })
  }
}


