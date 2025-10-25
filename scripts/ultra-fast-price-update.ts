import { runUltraFastPriceUpdate } from '@/services/ultraFastPriceUpdate'

async function main() {
  console.log('[ultra-fast-price-update] Starting ULTRA FAST price update...')
  
  try {
    const result = await runUltraFastPriceUpdate()
    console.log('[ultra-fast-price-update] Completed:', result)
  } catch (error) {
    console.error('[ultra-fast-price-update] Failed:', error)
    process.exit(1)
  }
}

main()
