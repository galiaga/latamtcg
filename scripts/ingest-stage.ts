#!/usr/bin/env node
/**
 * CLI wrapper for Stage phase of price ingestion pipeline
 * 
 * Usage:
 *   npm run ingest:stage -- --paper-only --dataset=default_cards --hard-timeout-ms=120000
 * 
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   SCRYFALL_BULK_DATASET - Dataset to use (default: default_cards)
 *   SCRYFALL_FILTER_PAPER_ONLY - Filter paper-only cards (default: false)
 *   SCRYFALL_JSON_PARSE_MODE - Parse mode (stream|buffer, default: auto)
 */

import { VercelStagePipeline } from '../src/scripts/vercel-ingest-stage'

interface CliArgs {
  paperOnly?: boolean
  dataset?: string
  hardTimeoutMs?: number
}

function parseArgs(): CliArgs {
  const args: CliArgs = {}
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    
    if (arg === '--paper-only') {
      args.paperOnly = true
    } else if (arg.startsWith('--dataset=')) {
      args.dataset = arg.split('=')[1]
    } else if (arg.startsWith('--hard-timeout-ms=')) {
      args.hardTimeoutMs = parseInt(arg.split('=')[1], 10)
    }
  }
  
  return args
}

async function main() {
  const args = parseArgs()
  
  // Set environment variables from CLI args
  if (args.paperOnly !== undefined) {
    process.env.SCRYFALL_FILTER_PAPER_ONLY = args.paperOnly ? 'true' : 'false'
  }
  if (args.dataset) {
    process.env.SCRYFALL_BULK_DATASET = args.dataset
  }
  
  console.log('[cli-stage] Starting Stage pipeline...')
  console.log('[cli-stage] Paper-only:', process.env.SCRYFALL_FILTER_PAPER_ONLY === 'true')
  console.log('[cli-stage] Dataset:', process.env.SCRYFALL_BULK_DATASET || 'default_cards')
  console.log('[cli-stage] Hard timeout:', args.hardTimeoutMs || 120000, 'ms')
  
  const startTime = Date.now()
  
  try {
    const pipeline = new VercelStagePipeline()
    const result = await pipeline.ingest({})
    
    const durationMs = Date.now() - startTime
    
    // Log JSON summary
    const summary = {
      ok: result.ok,
      parseMode: result.parseMode,
      paperOnly: result.paperOnly,
      rowsStaged: result.rowsStaged,
      mtgCardCount: result.mtgCardCount,
      consistencyRatio: result.consistencyRatio,
      durationMs,
      fallbackUsed: result.fallbackUsed,
      errorMessage: result.errorMessage
    }
    
    console.log('[cli-stage] Summary:', JSON.stringify(summary, null, 2))
    
    // Exit with error if gating disallowed or stage failed
    if (!result.ok) {
      console.error('[cli-stage] Stage failed')
      process.exit(1)
    }
    
    // Check gating
    const allowed = result.consistencyRatio !== undefined && 
                   result.consistencyRatio >= 0.95 && 
                   result.consistencyRatio <= 1.05
    
    if (!allowed) {
      console.error('[cli-stage] Gating disallowed (consistency ratio out of range)')
      process.exit(1)
    }
    
    console.log('[cli-stage] ✅ Stage completed successfully')
    process.exit(0)
    
  } catch (error) {
    console.error('[cli-stage] Fatal error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('[cli-stage] Unhandled error:', error)
    process.exit(1)
  })
}

