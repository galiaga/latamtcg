#!/usr/bin/env node
/**
 * CLI wrapper for Retention phase of price ingestion pipeline
 * 
 * Usage:
 *   npm run ingest:retention
 * 
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 */

import { VercelRetentionPipeline } from '../src/scripts/vercel-retention-30d'

async function main() {
  console.log('[cli-retention] Starting Retention pipeline...')
  
  const startTime = Date.now()
  
  try {
    const pipeline = new VercelRetentionPipeline()
    const result = await pipeline.ingest()
    
    const durationMs = Date.now() - startTime
    
    // Log JSON summary
    const summary = {
      ok: result.ok,
      skipped: result.skipped,
      deletedRows: result.deletedRows,
      durationMs,
      errorMessage: result.errorMessage
    }
    
    console.log('[cli-retention] Summary:', JSON.stringify(summary, null, 2))
    
    // Exit with error if retention failed
    if (!result.ok) {
      console.error('[cli-retention] Retention failed')
      process.exit(1)
    }
    
    if (result.skipped) {
      console.log('[cli-retention] ⏭️  Retention skipped')
    } else {
      console.log('[cli-retention] ✅ Retention completed successfully')
    }
    
    process.exit(0)
    
  } catch (error) {
    console.error('[cli-retention] Fatal error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('[cli-retention] Unhandled error:', error)
    process.exit(1)
  })
}

