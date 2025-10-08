// Enhanced cache adapter interface for horizontal scaling
// Supports memory (dev) and Redis (prod) with consistent API

export interface CacheAdapter {
  get<T = unknown>(key: string): Promise<T | null>
  set<T = unknown>(key: string, value: T, ttlSeconds: number): Promise<void>
  getSWR<T = unknown>(
    key: string, 
    ttlFresh: number, 
    ttlStale: number, 
    fetcher: () => Promise<T>
  ): Promise<T>
  withLock<T = unknown>(
    key: string, 
    ttlMs: number, 
    fn: () => Promise<T>
  ): Promise<T>
  clear(): Promise<void>
}

// Cache key builder for consistent normalization
export function buildCacheKey(params: Record<string, any>): string {
  const normalized: Record<string, any> = {}
  
  // Normalize query string (lowercase, unaccent, trim)
  if (params.q) {
    normalized.q = params.q
      .toLowerCase()
      .trim()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
  }
  
  // Include all other params with consistent ordering
  const sortedKeys = Object.keys(params)
    .filter(k => k !== 'q')
    .sort()
  
  for (const key of sortedKeys) {
    const value = params[key]
    if (value !== undefined && value !== null) {
      // Sort arrays for consistent keys
      if (Array.isArray(value)) {
        normalized[key] = [...value].sort()
      } else {
        normalized[key] = value
      }
    }
  }
  
  return JSON.stringify(normalized)
}

// Memory cache adapter
class MemoryCacheAdapter implements CacheAdapter {
  private memory = new Map<string, { value: unknown; expiresAt: number }>()
  private locks = new Map<string, Promise<any>>()

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.memory.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key)
      return null
    }
    return entry.value as T
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.memory.set(key, { 
      value, 
      expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000 
    })
  }

  async getSWR<T = unknown>(
    key: string, 
    ttlFresh: number, 
    ttlStale: number, 
    fetcher: () => Promise<T>
  ): Promise<T> {
    const entry = this.memory.get(key)
    const now = Date.now()
    
    if (entry && now <= entry.expiresAt) {
      // Fresh data - return immediately
      return entry.value as T
    }
    
    if (entry && now <= entry.expiresAt + (ttlStale - ttlFresh) * 1000) {
      // Stale data - return stale and refresh in background
      setImmediate(() => {
        fetcher().then(result => {
          this.set(key, result, ttlFresh)
        }).catch(() => {})
      })
      return entry.value as T
    }
    
    // No data or expired - fetch fresh
    const result = await fetcher()
    await this.set(key, result, ttlFresh)
    return result
  }

  async withLock<T = unknown>(
    key: string, 
    ttlMs: number, 
    fn: () => Promise<T>
  ): Promise<T> {
    const lockKey = `lock:${key}`
    const existing = this.locks.get(lockKey)
    
    if (existing) {
      return existing
    }
    
    const promise = this.executeWithLock(lockKey, ttlMs, fn)
    this.locks.set(lockKey, promise)
    
    try {
      const result = await promise
      return result
    } finally {
      this.locks.delete(lockKey)
    }
  }

  private async executeWithLock<T>(
    lockKey: string, 
    ttlMs: number, 
    fn: () => Promise<T>
  ): Promise<T> {
    const result = await fn()
    // Simple timeout for memory locks
    setTimeout(() => {
      this.locks.delete(lockKey)
    }, ttlMs)
    return result
  }

  async clear(): Promise<void> {
    this.memory.clear()
    this.locks.clear()
  }
}

// Redis cache adapter
class RedisCacheAdapter implements CacheAdapter {
  private redisClient: any = null
  private redisReady = false
  private locks = new Map<string, Promise<any>>()

  private async ensureRedis(): Promise<void> {
    if (this.redisReady || this.redisClient) return
    const url = process.env.REDIS_URL || ''
    if (!url) throw new Error('REDIS_URL not configured')
    
    try {
      const dynamicImport = new Function('s', 'return import(s)') as (s: string) => Promise<{ createClient: (config: { url: string }) => unknown }>
      const { createClient } = await dynamicImport('redis')
      this.redisClient = createClient({ url })
      this.redisClient.on('error', () => {})
      await this.redisClient.connect()
      this.redisReady = true
    } catch (error) {
      this.redisClient = null
      this.redisReady = false
      throw error
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    await this.ensureRedis()
    const raw = await this.redisClient.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.ensureRedis()
    await this.redisClient.set(key, JSON.stringify(value), { EX: Math.max(1, ttlSeconds) })
  }

  async getSWR<T = unknown>(
    key: string, 
    ttlFresh: number, 
    ttlStale: number, 
    fetcher: () => Promise<T>
  ): Promise<T> {
    await this.ensureRedis()
    
    // Check if key exists and get TTL
    const ttl = await this.redisClient.ttl(key)
    
    if (ttl > 0) {
      if (ttl > ttlStale - ttlFresh) {
        // Fresh data - return immediately
        const raw = await this.redisClient.get(key)
        return JSON.parse(raw) as T
      } else {
        // Stale data - return stale and refresh in background
        const raw = await this.redisClient.get(key)
        setImmediate(() => {
          fetcher().then(result => {
            this.set(key, result, ttlFresh)
          }).catch(() => {})
        })
        return JSON.parse(raw) as T
      }
    }
    
    // No data or expired - fetch fresh
    const result = await fetcher()
    await this.set(key, result, ttlFresh)
    return result
  }

  async withLock<T = unknown>(
    key: string, 
    ttlMs: number, 
    fn: () => Promise<T>
  ): Promise<T> {
    const lockKey = `lock:${key}`
    const existing = this.locks.get(lockKey)
    
    if (existing) {
      return existing
    }
    
    const promise = this.executeWithRedisLock(lockKey, ttlMs, fn)
    this.locks.set(lockKey, promise)
    
    try {
      const result = await promise
      return result
    } finally {
      this.locks.delete(lockKey)
    }
  }

  private async executeWithRedisLock<T>(
    lockKey: string, 
    ttlMs: number, 
    fn: () => Promise<T>
  ): Promise<T> {
    await this.ensureRedis()
    
    // Try to acquire lock with SET NX EX
    const acquired = await this.redisClient.set(lockKey, '1', { NX: true, EX: Math.ceil(ttlMs / 1000) })
    
    if (!acquired) {
      // Lock already exists, wait and retry
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.executeWithRedisLock(lockKey, ttlMs, fn)
    }
    
    try {
      const result = await fn()
      return result
    } finally {
      await this.redisClient.del(lockKey)
    }
  }

  async clear(): Promise<void> {
    await this.ensureRedis()
    await this.redisClient.flushAll()
    this.locks.clear()
  }
}

// Factory function to create cache adapter
export function createCacheAdapter(): CacheAdapter {
  const driver = process.env.CACHE_DRIVER || 'memory'
  
  if (driver === 'redis') {
    return new RedisCacheAdapter()
  }
  
  return new MemoryCacheAdapter()
}

// Global cache instance
export const cache = createCacheAdapter()

// Legacy compatibility functions
export async function cacheGetJSON<T = unknown>(key: string): Promise<T | null> {
  const t0 = Date.now()
  try {
    const result = await cache.get<T>(key)
    const latencyMs = Date.now() - t0
    const driver = process.env.CACHE_DRIVER || 'memory'
    console.log(JSON.stringify({ 
      event: 'cache', 
      op: result ? 'hit' : 'miss', 
      driver, 
      keyHash: key.length,
      latencyMs 
    }))
    return result
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

export async function cacheSetJSON<T = unknown>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const t0 = Date.now()
  try {
    await cache.set(key, value, ttlSeconds)
    const latencyMs = Date.now() - t0
    const driver = process.env.CACHE_DRIVER || 'memory'
    console.log(JSON.stringify({ 
      event: 'cache', 
      op: 'set', 
      driver, 
      keyHash: key.length,
      ttl: ttlSeconds,
      latencyMs 
    }))
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export async function cacheClear(): Promise<void> {
  try {
    await cache.clear()
    const driver = process.env.CACHE_DRIVER || 'memory'
    console.log(JSON.stringify({ 
      event: 'cache', 
      op: 'clear', 
      driver 
    }))
  } catch (error) {
    console.error('Cache clear error:', error)
  }
}
