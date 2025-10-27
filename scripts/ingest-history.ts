#!/usr/bin/env node
/**
 * CLI wrapper for History phase of price ingestion pipeline
 * 
 * Usage:
 *   npm run ingest:history
 * 
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 */

import { VercelHistoryUpsertPipeline } from '../src/scripts/vercel-ingest-upsert-history'

async function main() {
  console.log('[cli-history] Starting History pipeline...')
  
  const startTime = Date.now()
  
  try {
    const pipeline = new VercelHistoryUpsertPipeline()
    const result = await pipeline.ingest()
    
    const durationMs = Date.now() - startTime
    
    // Log JSON summary
    const summary = {
      ok: result.ok,
      skipped: result.skipped,
      historyUpserts: result.historyUpserts,
      rowsStagedToday: result.rowsStagedToday,
      upsertsPerRow: result.upsertsPerRow,
      durationMs,
      skipReason: result.skipReason,
      errorMessage: result.errorMessage
    }
    
    console.log('[cli-history] Summary:', JSON.stringify(summary, null, 2))
    
    // Exit with error if history failed (but not if skipped due to gating)
    if (!result.ok) {
      console.error('[cli-history] History failed')
      process.exit(1)
    }
    
    if (result.skipped) {
      console.log('[cli-history] ⏭️  History skipped:', result.skipReason)
    } else {
      console.log('[cli-history] ✅ History completed successfully')
    }
    
    process.exit(0)
    
  } catch (error) {
    console.error('[cli-history] Fatal error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('[cli-history] Unhandled error:', error)
    process.exit(1)
  })
}

