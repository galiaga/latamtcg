#!/usr/bin/env tsx

import { runDailyPriceUpdate } from '../../src/services/scryfallIngestDaily'

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const mode = process.env.CRON_PIPELINE ?? 'legacy'
  
  console.log(`[cron] Starting cron job - Mode: ${mode}, Dry run: ${dryRun}`)
  
  try {
    const result = await runDailyPriceUpdate()
    console.log('[cron] Cron job completed successfully:', result)
    process.exit(0)
  } catch (error) {
    console.error('[cron] Cron job failed:', error)
    process.exit(1)
  }
}

main()
