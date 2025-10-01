import { NextRequest, NextResponse } from 'next/server'
// Defer import to server handler to avoid edge bundling of server-only module

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

    const { runScryfallRefresh } = await import('@/services/scryfallIngest')
    const result = await runScryfallRefresh()
    return NextResponse.json(result)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- logging path, not critical to type precisely
  } catch (err: any) {
    console.error('[scryfall] Job failed', err)
    return NextResponse.json({ error: 'Job failed' }, { status: 500 })
  }
}


