import { runWorkingPriceUpdate } from '@/services/workingPriceUpdate'

async function main() {
  console.log('[working-price-update] Starting WORKING price update...')
  
  try {
    const result = await runWorkingPriceUpdate()
    console.log('[working-price-update] Completed:', result)
  } catch (error) {
    console.error('[working-price-update] Failed:', error)
    process.exit(1)
  }
}

main()
