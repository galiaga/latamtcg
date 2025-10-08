// Legacy cache wrapper - now uses enhanced cache adapter
// This file maintains backward compatibility while the new interface is in src/lib/cache/index.ts

export { 
  cacheGetJSON, 
  cacheSetJSON, 
  cacheClear,
  buildCacheKey,
  createCacheAdapter,
  cache
} from './cache/index'


