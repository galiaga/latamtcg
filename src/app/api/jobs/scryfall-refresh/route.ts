import { NextRequest, NextResponse } from 'next/server'
// Defer import to server handler to avoid edge bundling of server-only module

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(req: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET
    
    // Log request details for debugging
    console.log('[cron] Request details:', {
      userAgent: req.headers.get('user-agent'),
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.get('authorization'),
      hasToken: !!new URL(req.url).searchParams.get('token')
    })
    
    // Check if this is a Vercel cron job by looking for specific indicators
    const userAgent = req.headers.get('user-agent') || ''
    const isVercelCron = !userAgent || 
                         userAgent.includes('vercel') || 
                         userAgent.includes('cron') ||
                         userAgent === '' // Empty user agent might indicate Vercel cron
    
    if (!isVercelCron) {
      // This is a manual request - require authentication
      const authHeader = req.headers.get('authorization') || ''
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
      const url = new URL(req.url)
      const qp = url.searchParams.get('token')
      const token = bearer || qp
      
      if (!expected || !token || token !== expected) {
        console.log('[cron] Authentication failed for manual request')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.log('[cron] Detected Vercel cron job, proceeding without manual auth')
    }

    console.log('[cron] Starting daily price update...')
    const { runDailyPriceUpdate } = await import('@/services/scryfallIngestDaily')
    const result = await runDailyPriceUpdate()
    console.log('[cron] Daily price update completed:', result)
    return NextResponse.json(result)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- logging path, not critical to type precisely
  } catch (err: any) {
    console.error('[scryfall] Job failed', err)
    return NextResponse.json({ error: 'Job failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) { return handle(req) }
export async function GET(req: NextRequest) { return handle(req) }


