#!/usr/bin/env node
/**
 * CLI wrapper for Update phase of price ingestion pipeline
 * 
 * Usage:
 *   npm run ingest:update
 * 
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 */

import { VercelUpdatePipeline } from '../src/scripts/vercel-ingest-update'

async function main() {
  console.log('[cli-update] Starting Update pipeline...')
  
  const startTime = Date.now()
  
  try {
    const pipeline = new VercelUpdatePipeline()
    const result = await pipeline.ingest()
    
    const durationMs = Date.now() - startTime
    
    // Log JSON summary
    const summary = {
      ok: result.ok,
      skipped: result.skipped,
      cardsMatched: result.cardsMatched,
      cardsUpdated: result.cardsUpdated,
      durationMs,
      skipReason: result.skipReason,
      errorMessage: result.errorMessage
    }
    
    console.log('[cli-update] Summary:', JSON.stringify(summary, null, 2))
    
    // Exit with error if update failed (but not if skipped due to gating)
    if (!result.ok) {
      console.error('[cli-update] Update failed')
      process.exit(1)
    }
    
    if (result.skipped) {
      console.log('[cli-update] ⏭️  Update skipped:', result.skipReason)
    } else {
      console.log('[cli-update] ✅ Update completed successfully')
    }
    
    process.exit(0)
    
  } catch (error) {
    console.error('[cli-update] Fatal error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('[cli-update] Unhandled error:', error)
    process.exit(1)
  })
}

