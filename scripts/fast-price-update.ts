import { runFastPriceUpdate } from '@/services/fastPriceUpdate'

async function main() {
  console.log('[fast-price-update] Starting FAST price update...')
  
  try {
    const result = await runFastPriceUpdate()
    console.log('[fast-price-update] Completed:', result)
  } catch (error) {
    console.error('[fast-price-update] Failed:', error)
    process.exit(1)
  }
}

main()
