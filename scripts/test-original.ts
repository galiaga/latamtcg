import { runDailyPriceUpdate } from '@/services/scryfallIngestDaily'

async function main() {
  console.log('[original-cron] Starting original working cron job...')
  
  try {
    const result = await runDailyPriceUpdate()
    console.log('[original-cron] Completed:', result)
  } catch (error) {
    console.error('[original-cron] Failed:', error)
    process.exit(1)
  }
}

main()
