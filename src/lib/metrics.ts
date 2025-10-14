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

export function flushMetrics() {
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
