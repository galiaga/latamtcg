import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(req: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET
    
    // Log request details for debugging
    console.log('[cron] Update request details:', {
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

    console.log('[cron] Starting Vercel Update + History + Retention...')
    
    // Step 1: Update cards
    const { VercelUpdatePipeline } = await import('@/scripts/vercel-ingest-update')
    const updatePipeline = new VercelUpdatePipeline()
    const updateResult = await updatePipeline.ingest()
    
    // Step 2: Upsert history (only if update succeeded)
    let historyResult = null
    if (updateResult.ok) {
      console.log('[cron] Running history upsert...')
      const { VercelHistoryUpsertPipeline } = await import('@/scripts/vercel-ingest-upsert-history')
      const historyPipeline = new VercelHistoryUpsertPipeline()
      historyResult = await historyPipeline.ingest()
    }
    
    // Step 3: Run retention cleanup (only if both previous steps succeeded)
    let retentionResult = null
    if (updateResult.ok && historyResult?.ok) {
      console.log('[cron] Running retention cleanup...')
      const { VercelRetentionPipeline } = await import('@/scripts/vercel-retention-30d')
      const retentionPipeline = new VercelRetentionPipeline()
      retentionResult = await retentionPipeline.ingest()
    }
    
    const combinedResult = {
      ok: updateResult.ok && historyResult?.ok && retentionResult?.ok,
      update: updateResult,
      history: historyResult,
      retention: retentionResult,
      totalDurationMs: (updateResult.durationMs || 0) + (historyResult?.durationMs || 0) + (retentionResult?.durationMs || 0)
    }
    
    console.log('[cron] Vercel Update + History + Retention completed:', combinedResult)
    return NextResponse.json(combinedResult)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- logging path, not critical to type precisely
  } catch (err: any) {
    console.error('[cron] Update job failed', err)
    return NextResponse.json({ error: 'Job failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) { return handle(req) }
export async function GET(req: NextRequest) { return handle(req) }
