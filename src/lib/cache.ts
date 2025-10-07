// Lightweight cache wrapper: in-memory in dev, Redis in prod if REDIS_URL is set.
// Stores JSON-serializable values only.

// Simple cache value container
const memory = new Map<string, { value: unknown; expiresAt: number }>()
// Lazy optional redis client
let redisClient: { get: (key: string) => Promise<string | null>; set: (key: string, value: string, options: { EX: number }) => Promise<void>; flushAll: () => Promise<void>; on: (event: string, handler: () => void) => void; connect: () => Promise<void> } | null = null
let redisReady = false

async function ensureRedis(): Promise<void> {
  if (redisReady || redisClient) return
  const url = process.env.REDIS_URL || ''
  if (!url) return
  try {
    // Avoid bundler/module resolution warnings by dynamically importing via eval
    // Only executes when REDIS_URL is set on the server
     
    // Dynamic import helper
    const dynamicImport = new Function('s', 'return import(s)') as (s: string) => Promise<{ createClient: (config: { url: string }) => unknown }>
    const { createClient } = await dynamicImport('redis')
    redisClient = createClient({ url }) as { get: (key: string) => Promise<string | null>; set: (key: string, value: string, options: { EX: number }) => Promise<void>; flushAll: () => Promise<void>; on: (event: string, handler: () => void) => void; connect: () => Promise<void> }
    redisClient.on('error', () => {})
    await redisClient.connect()
    redisReady = true
  } catch {
    redisClient = null
    redisReady = false
  }
}

export async function cacheGetJSON<T = unknown>(key: string): Promise<T | null> {
  const t0 = Date.now()
  try {
    await ensureRedis()
    if (redisReady && redisClient) {
      const raw = await redisClient.get(key)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      try { console.log(JSON.stringify({ event: 'cache.hit', layer: 'redis', keyLen: key.length, latencyMs: Date.now() - t0 })) } catch {}
      return parsed as T
    }
  } catch {}

  // Fallback to memory
  const entry = memory.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memory.delete(key)
    return null
  }
  try { console.log(JSON.stringify({ event: 'cache.hit', layer: 'memory', keyLen: key.length, latencyMs: Date.now() - t0 })) } catch {}
  return entry.value as T
}

export async function cacheSetJSON<T = unknown>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const t0 = Date.now()
  try {
    await ensureRedis()
    if (redisReady && redisClient) {
      await redisClient.set(key, JSON.stringify(value), { EX: Math.max(1, ttlSeconds) })
      try { console.log(JSON.stringify({ event: 'cache.set', layer: 'redis', keyLen: key.length, ttl: ttlSeconds, latencyMs: Date.now() - t0 })) } catch {}
      return
    }
  } catch {}
  memory.set(key, { value, expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000 })
  try { console.log(JSON.stringify({ event: 'cache.set', layer: 'memory', keyLen: key.length, ttl: ttlSeconds, latencyMs: Date.now() - t0 })) } catch {}
}

export async function cacheClear(): Promise<void> {
  try {
    await ensureRedis()
    if (redisReady && redisClient) {
      await redisClient.flushAll()
      try { console.log(JSON.stringify({ event: 'cache.clear', layer: 'redis' })) } catch {}
    }
  } catch {}
  memory.clear()
  try { console.log(JSON.stringify({ event: 'cache.clear', layer: 'memory' })) } catch {}
}


