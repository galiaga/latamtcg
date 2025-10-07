#!/usr/bin/env tsx

import { cacheClear } from '@/lib/cache'

async function main() {
  console.log('[bust-cache] Clearing all caches...')
  await cacheClear()
  console.log('[bust-cache] Cache cleared successfully')
}

main().catch(console.error)
