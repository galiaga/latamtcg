#!/usr/bin/env tsx

/**
 * Refresh item popularity materialized view
 * This script can be run via cron job every 15 minutes
 */

import { prisma } from '@/lib/prisma'

async function main() {
  const t0 = Date.now()
  
  try {
    console.log('[popularity] Starting refresh...')
    
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
    
    console.log(JSON.stringify({
      event: 'popularity.refresh',
      durationMs: t1 - t0,
      rows: Number(statsObj?.row_count || 0),
      maxScore: statsObj?.max_score ? Number(statsObj.max_score) : null,
      avgScore: statsObj?.avg_score ? Number(statsObj.avg_score) : null,
      refreshedAt: new Date().toISOString()
    }))
    
    console.log('[popularity] Refresh completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('[popularity] Refresh failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

