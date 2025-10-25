import { runSimplePriceUpdate } from '@/services/simplePriceUpdate'

async function main() {
  console.log('[simple-price-update] Starting simple price update...')
  
  try {
    const result = await runSimplePriceUpdate()
    console.log('[simple-price-update] Completed:', result)
  } catch (error) {
    console.error('[simple-price-update] Failed:', error)
    process.exit(1)
  }
}

main()