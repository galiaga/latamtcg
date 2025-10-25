import { SecurePriceIngestionPipeline } from '../../scripts/ingest-scryfall-prices-secure'
import path from 'path'

export async function runSecurePriceUpdate(): Promise<{
  updated: number
  skipped: boolean
  durationMs: number
  runId?: number
  cardsUpdated?: number
  historyUpserts?: number
}> {
  const startTime = Date.now()
  
  try {
    console.log('[scryfall] Starting secure price update...')
    
    const pipeline = new SecurePriceIngestionPipeline()
    
    // Use local CSV file (assumes it's already downloaded)
    const csvPath = path.join(process.cwd(), 'data', 'daily-prices.csv')
    const result = await pipeline.ingest({ file: csvPath })
    
    const durationMs = Date.now() - startTime
    
    return {
      updated: result.cardsUpdated || 0,
      skipped: false,
      durationMs,
      runId: result.runId,
      cardsUpdated: result.cardsUpdated,
      historyUpserts: result.historyUpserts
    }
    
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    console.error('[scryfall] Secure price update failed:', error)
    
    return {
      updated: 0,
      skipped: true,
      durationMs
    }
  }
}
