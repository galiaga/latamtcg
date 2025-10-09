import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-process metrics collection
interface RouteMetrics {
  route: string
  count: number
  totalLatency: number
  errors: number
  latencies: number[]
}

const metrics = new Map<string, RouteMetrics>()

export function recordMetric(route: string, latencyMs: number, isError: boolean = false) {
  const existing = metrics.get(route) || {
    route,
    count: 0,
    totalLatency: 0,
    errors: 0,
    latencies: []
  }
  
  existing.count++
  existing.totalLatency += latencyMs
  existing.latencies.push(latencyMs)
  if (isError) existing.errors++
  
  // Keep only last 100 latencies for P50/P95 calculation
  if (existing.latencies.length > 100) {
    existing.latencies = existing.latencies.slice(-100)
  }
  
  metrics.set(route, existing)
}

function calculatePercentile(latencies: number[], percentile: number): number {
  if (latencies.length === 0) return 0
  const sorted = [...latencies].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

function flushMetrics() {
  const now = Date.now()
  const flushed: Array<{
    event: 'metrics.flush'
    route: string
    p50: number
    p95: number
    count: number
    '5xx': number
    timestamp: number
  }> = []
  
  for (const [route, data] of metrics.entries()) {
    if (data.count > 0) {
      const p50 = calculatePercentile(data.latencies, 50)
      const p95 = calculatePercentile(data.latencies, 95)
      
      flushed.push({
        event: 'metrics.flush',
        route,
        p50: Math.round(p50),
        p95: Math.round(p95),
        count: data.count,
        '5xx': data.errors,
        timestamp: now
      })
      
      // Reset metrics after flushing
      metrics.set(route, {
        route,
        count: 0,
        totalLatency: 0,
        errors: 0,
        latencies: []
      })
    }
  }
  
  if (flushed.length > 0) {
    console.log(JSON.stringify(flushed))
  }
}

// Flush metrics every 30 seconds
let metricsTimer: NodeJS.Timeout | null = null
if (typeof window === 'undefined') {
  metricsTimer = setInterval(flushMetrics, 30000)
}

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