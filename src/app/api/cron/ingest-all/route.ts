import { NextRequest, NextResponse } from 'next/server'
import { VercelStagePipeline } from '@/scripts/vercel-ingest-stage'
import { VercelUpdatePipeline } from '@/scripts/vercel-ingest-update'
import { VercelHistoryUpsertPipeline } from '@/scripts/vercel-ingest-upsert-history'
import { VercelRetentionPipeline } from '@/scripts/vercel-retention-30d'

// Types for consolidated response
interface PhaseResult {
  ok: boolean
  skipped: boolean
  skipReason?: string
  durationMs: number
  errorMessage?: string
  [key: string]: any // Allow additional metrics
}

interface ConsolidatedResult {
  ok: boolean
  totalDurationMs: number
  phases: {
    stage: PhaseResult
    update: PhaseResult
    history: PhaseResult
    retention: PhaseResult
  }
}

// Auth check: allow Vercel cron without token, or check token/header for manual runs
function isAuthorized(request: NextRequest): boolean {
  // Allow Vercel cron by User-Agent
  const userAgent = request.headers.get('user-agent') || ''
  if (userAgent.includes('vercel-cron')) {
    return true
  }

  // For manual runs, check token in query or header
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return false // No secret configured
  }

  const token = request.nextUrl.searchParams.get('token') || 
                request.headers.get('x-cron-secret')

  return token === cronSecret
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}

async function handleRequest(request: NextRequest) {
  const startTime = Date.now()

  // Check authentication
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Valid token required for manual runs' },
      { status: 401 }
    )
  }

  console.log(`[ingest-all] Starting consolidated price ingestion pipeline...`)
  
  const result: ConsolidatedResult = {
    ok: true,
    totalDurationMs: 0,
    phases: {
      stage: { ok: false, skipped: false, durationMs: 0, errorMessage: 'Not run' },
      update: { ok: false, skipped: false, durationMs: 0, errorMessage: 'Skipped - Stage required first' },
      history: { ok: false, skipped: false, durationMs: 0, errorMessage: 'Skipped - Stage required first' },
      retention: { ok: false, skipped: false, durationMs: 0, errorMessage: 'Not run' }
    }
  }

  // Phase 1: Stage
  try {
    console.log(`[ingest-all] Phase 1: Stage...`)
    const stageStartTime = Date.now()
    const stagePipeline = new VercelStagePipeline()
    const stageResult = await stagePipeline.ingest({}) // Auto-convert mode
    const stageDuration = Date.now() - stageStartTime

    result.phases.stage = {
      ok: stageResult.ok,
      skipped: stageResult.skipped,
      durationMs: stageDuration,
      errorMessage: stageResult.errorMessage,
      // Include all Stage metrics
      runId: stageResult.runId,
      rowsStaged: stageResult.rowsStaged,
      downloadMs: stageResult.downloadMs,
      convertMs: stageResult.convertMs,
      rowsInCsv: stageResult.rowsInCsv,
      rowsInJson: stageResult.rowsInJson,
      rowsWrittenCsv: stageResult.rowsWrittenCsv,
      rowsFilteredOut: stageResult.rowsFilteredOut,
      stageMs: stageResult.stageMs,
      copyMs: stageResult.copyMs,
      datasetType: stageResult.datasetType,
      paperOnly: stageResult.paperOnly,
      mtgCardCount: stageResult.mtgCardCount,
      consistencyRatio: stageResult.consistencyRatio,
      consistencyWarning: stageResult.consistencyWarning,
      parseMode: stageResult.parseMode,
      fallbackUsed: stageResult.fallbackUsed
    }

    // Determine if Stage passed gating (allowed)
    const stageAllowed = !stageResult.consistencyWarning && 
                         stageResult.consistencyRatio !== undefined &&
                         stageResult.consistencyRatio >= 0.95 && 
                         stageResult.consistencyRatio <= 1.05
    
    console.log(`[ingest-all] ✅ Stage completed: allowed=${stageAllowed}, rowsStaged=${stageResult.rowsStaged}`)

    // Check if Stage succeeded
    if (!stageResult.ok) {
      const isTimeout = stageResult.errorMessage === 'stage-timeout'
      console.log(`[ingest-all] ❌ Stage failed${isTimeout ? ' (timeout after 120s)' : ''}, stopping pipeline`)
      result.ok = false
      result.totalDurationMs = Date.now() - startTime
      return NextResponse.json(result, { status: 500 })
    }

    // Check if Stage passed gating (allowed)
    if (!stageAllowed) {
      console.log(`[ingest-all] ⏭️  Stage blocked by gating, skipping Update and History`)
      result.phases.update = {
        ok: true,
        skipped: true,
        durationMs: 0,
        skipReason: 'Stage gating failed',
        cardsUpdated: 0,
        cardsMatched: 0,
        updateMs: 0,
        runId: 0
      }
      result.phases.history = {
        ok: true,
        skipped: true,
        durationMs: 0,
        skipReason: 'Stage gating failed',
        historyUpserts: 0,
        runId: 0
      }
      result.totalDurationMs = Date.now() - startTime
      return NextResponse.json(result)
    }

    // Phase 2: Update (only if Stage passed)
    const updateStartTime = Date.now()
    try {
      console.log(`[ingest-all] Phase 2: Update...`)
      const updatePipeline = new VercelUpdatePipeline()
      const updateResult = await updatePipeline.ingest()
      const updateDuration = Date.now() - updateStartTime

      result.phases.update = {
        ok: updateResult.ok,
        skipped: updateResult.skipped,
        durationMs: updateDuration,
        errorMessage: updateResult.errorMessage,
        skipReason: updateResult.skipReason,
        runId: updateResult.runId,
        cardsUpdated: updateResult.cardsUpdated,
        cardsMatched: updateResult.cardsMatched,
        updateMs: updateResult.updateMs
      }

      console.log(`[ingest-all] ✅ Update completed: cardsUpdated=${updateResult.cardsUpdated}, cardsMatched=${updateResult.cardsMatched}`)

      // Check if Update succeeded
      if (!updateResult.ok) {
        console.log(`[ingest-all] ❌ Update failed`)
        result.ok = false
      }

      // Phase 3: History (only if Update succeeded)
      if (updateResult.ok && !updateResult.skipped) {
        const historyStartTime = Date.now()
        try {
          console.log(`[ingest-all] Phase 3: History...`)
          const historyPipeline = new VercelHistoryUpsertPipeline()
          const historyResult = await historyPipeline.ingest()
          const historyDuration = Date.now() - historyStartTime

          result.phases.history = {
            ok: historyResult.ok,
            skipped: historyResult.skipped,
            durationMs: historyDuration,
            errorMessage: historyResult.errorMessage,
            skipReason: historyResult.skipReason,
            runId: historyResult.runId,
            historyUpserts: historyResult.historyUpserts,
            rowsStagedToday: historyResult.rowsStagedToday,
            historyUpsertsToday: historyResult.historyUpsertsToday,
            upsertsPerRow: historyResult.upsertsPerRow
          }

          console.log(`[ingest-all] ✅ History completed: historyUpserts=${historyResult.historyUpserts}`)

          // Check if History succeeded
          if (!historyResult.ok) {
            console.log(`[ingest-all] ❌ History failed`)
            result.ok = false
          }

        } catch (error) {
          console.error(`[ingest-all] ❌ History error:`, error)
          result.phases.history = {
            ok: false,
            skipped: false,
            durationMs: Date.now() - historyStartTime,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
          result.ok = false
        }
      } else {
        console.log(`[ingest-all] ⏭️  Skipping History (Update skipped or failed)`)
        result.phases.history = {
          ok: true,
          skipped: true,
          durationMs: 0,
          skipReason: 'Update skipped or failed'
        }
      }

      // Phase 4: Retention (optional, configurable via RETENTION_ON_INGEST_ALL)
      const retentionEnabled = process.env.RETENTION_ON_INGEST_ALL !== 'false'
      if (retentionEnabled && stageResult.ok && updateResult.ok) {
        const retentionStartTime = Date.now()
        try {
          console.log(`[ingest-all] Phase 4: Retention...`)
          const retentionPipeline = new VercelRetentionPipeline()
          const retentionResult = await retentionPipeline.ingest()
          const retentionDuration = Date.now() - retentionStartTime

          result.phases.retention = {
            ok: retentionResult.ok,
            skipped: retentionResult.skipped,
            durationMs: retentionDuration,
            errorMessage: retentionResult.errorMessage,
            runId: retentionResult.runId || 0,
            deletedRows: retentionResult.deletedRows || 0
          }

          console.log(`[ingest-all] ✅ Retention completed: deletedRows=${retentionResult.deletedRows}`)

        } catch (error) {
          console.error(`[ingest-all] ❌ Retention error:`, error)
          result.phases.retention = {
            ok: false,
            skipped: false,
            durationMs: Date.now() - retentionStartTime,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
          // Don't fail the entire pipeline if Retention fails
        }
      } else {
        console.log(`[ingest-all] ⏭️  Skipping Retention (disabled or upstream failed)`)
        result.phases.retention = {
          ok: true,
          skipped: true,
          durationMs: 0,
          skipReason: retentionEnabled ? 'Upstream failed' : 'Disabled by RETENTION_ON_INGEST_ALL=false'
        }
      }

    } catch (error) {
      console.error(`[ingest-all] ❌ Update error:`, error)
      result.phases.update = {
        ok: false,
        skipped: false,
        durationMs: Date.now() - updateStartTime,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
      result.ok = false
    }

  } catch (error) {
    console.error(`[ingest-all] ❌ Stage error:`, error)
    result.phases.stage = {
      ok: false,
      skipped: false,
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : String(error)
    }
    result.ok = false
  }

  result.totalDurationMs = Date.now() - startTime

  console.log(`[ingest-all] 🎉 Pipeline completed in ${result.totalDurationMs}ms`)
  console.log(`[ingest-all] Stage: ${result.phases.stage.ok ? '✅' : '❌'} (${result.phases.stage.durationMs}ms)`)
  console.log(`[ingest-all] Update: ${result.phases.update.ok && !result.phases.update.skipped ? '✅' : '⏭️'} (${result.phases.update.durationMs}ms)`)
  console.log(`[ingest-all] History: ${result.phases.history.ok && !result.phases.history.skipped ? '✅' : '⏭️'} (${result.phases.history.durationMs}ms)`)
  console.log(`[ingest-all] Retention: ${result.phases.retention.ok && !result.phases.retention.skipped ? '✅' : '⏭️'} (${result.phases.retention.durationMs}ms)`)

  return NextResponse.json(result, { 
    status: result.ok ? 200 : 500 
  })
}

