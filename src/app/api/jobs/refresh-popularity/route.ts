import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handle(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const expected = process.env.CRON_SECRET
    
    // Check if this is a Vercel cron job
    const userAgent = req.headers.get('user-agent') || ''
    const isVercelCron = !userAgent || 
                         userAgent.includes('vercel') || 
                         userAgent.includes('cron') ||
                         userAgent === ''
    
    if (!isVercelCron && !isDev) {
      // This is a manual request - require authentication
      const url = new URL(req.url)
      const qp = url.searchParams.get('token')
      const providedToken = token || qp
      
      if (!expected || !providedToken || providedToken !== expected) {
        console.log('[popularity-refresh] Authentication failed for manual request')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.log('[popularity-refresh] Detected Vercel cron job, proceeding without manual auth')
    }

    console.log('[popularity-refresh] Starting refresh...')
    const t0 = Date.now()
    
    // Refresh the materialized view concurrently (non-blocking)
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY public.item_popularity_mv`
    
    // Get telemetry data
    const stats = await prisma.$queryRaw<Array<{
      row_count: bigint
      max_score: number | null
      avg_score: number | null
    }>>`
      SELECT 
        COUNT(*)::bigint AS row_count,
        MAX(popularity_score)::numeric AS max_score,
        AVG(popularity_score)::numeric AS avg_score
      FROM public.item_popularity_mv
    `
    
    const statsObj = stats[0]
    const t1 = Date.now()
    
    const result = {
      ok: true,
      durationMs: t1 - t0,
      rows: Number(statsObj?.row_count || 0),
      maxScore: statsObj?.max_score ? Number(statsObj.max_score) : null,
      avgScore: statsObj?.avg_score ? Number(statsObj.avg_score) : null,
      refreshedAt: new Date().toISOString()
    }
    
    console.log(JSON.stringify({
      event: 'popularity.refresh',
      ...result
    }))
    
    console.log('[popularity-refresh] Refresh completed successfully')
    return NextResponse.json(result)
  } catch (err) {
    console.error('[popularity-refresh] failed', err)
    return NextResponse.json({ error: 'failed', details: String(err) }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(req: NextRequest) { return handle(req) }
export async function POST(req: NextRequest) { return handle(req) }

