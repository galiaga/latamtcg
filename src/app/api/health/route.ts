import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/cache'
import { recordMetric } from '@/lib/metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const url = new URL(req.url)
  const deep = url.searchParams.get('deep') === '1'
  
  try {
    // Fast path - basic health check
    const basicHealth = {
      ok: true,
      version: process.env.npm_package_version || '0.19.0',
      time: new Date().toISOString(),
      uptime: process.uptime()
    }
    
    if (!deep) {
      recordMetric('/api/health', Date.now() - startTime)
      return NextResponse.json(basicHealth)
    }
    
    // Deep health check - test DB and Redis connectivity
    const deepHealth = { ...basicHealth, db: 'unknown', redis: 'unknown' }
    
    // Test database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`
      deepHealth.db = 'ok'
    } catch (error) {
      deepHealth.db = 'fail'
      console.error('[health] DB check failed:', error)
    }
    
    // Test Redis connectivity (if configured)
    try {
      if (process.env.CACHE_DRIVER === 'redis' || process.env.REDIS_URL) {
        await cache.get('health:test')
        deepHealth.redis = 'ok'
      } else {
        deepHealth.redis = 'skip'
      }
    } catch (error) {
      deepHealth.redis = 'fail'
      console.error('[health] Redis check failed:', error)
    }
    
    recordMetric('/api/health', Date.now() - startTime)
    return NextResponse.json(deepHealth)
    
  } catch (error) {
    recordMetric('/api/health', Date.now() - startTime, true)
    console.error('[health] Health check failed:', error)
    return NextResponse.json(
      { ok: false, error: 'Health check failed' },
      { status: 500 }
    )
  }
}