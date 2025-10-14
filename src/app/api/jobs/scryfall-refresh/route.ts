import { NextRequest, NextResponse } from 'next/server'
// Defer import to server handler to avoid edge bundling of server-only module

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(req: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization') || ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const url = new URL(req.url)
    const qp = url.searchParams.get('token')
    const token = bearer || qp
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

export async function POST(req: NextRequest) { return handle(req) }
export async function GET(req: NextRequest) { return handle(req) }


