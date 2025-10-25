import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(req: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET
    
    // Log request details for debugging
    console.log('[cron] Stage request details:', {
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

    console.log('[cron] Starting Stage-only Pipeline...')
    
    // Stage CSV data only
    const { VercelStagePipeline } = await import('@/scripts/vercel-ingest-stage')
    const stagePipeline = new VercelStagePipeline()
    const stageResult = await stagePipeline.ingest({}) // No parameters = auto-convert Scryfall JSON
    
    console.log('[cron] Stage-only Pipeline completed:', stageResult)
    return NextResponse.json(stageResult)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- logging path, not critical to type precisely
  } catch (err: any) {
    console.error('[cron] Stage job failed', err)
    return NextResponse.json({ error: 'Job failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) { return handle(req) }
export async function GET(req: NextRequest) { return handle(req) }
