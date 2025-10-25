import { Client } from 'pg'
import { config } from 'dotenv'
import { format } from 'date-fns-tz'

// Load environment variables
config({ path: '.env.local' })

interface HistoryUpsertResult {
  ok: boolean
  skipped: boolean
  durationMs: number
  historyUpserts: number
  runId: number
  rowsStagedToday?: number
  historyUpsertsToday?: number
  upsertsPerRow?: number
  skipReason?: string
  errorMessage?: string
}

interface AuditRun {
  startedAt: Date
  status: 'running' | 'completed' | 'failed'
  priceDay: string
  upsertHistoryMs?: number
  historyUpserts?: number
  errorMessage?: string
}

export class VercelHistoryUpsertPipeline {
  private client: Client
  private auditRun: AuditRun

  constructor() {
    // Use Session Pooler URL with proper SSL configuration
    let connectionString = process.env.DATABASE_URL
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required')
    }
    
    // SSL Configuration with Supabase CA Certificate
    const sslConfig = this.getSSLConfig()
    
    // Set appropriate sslmode based on SSL configuration
    const sslMode = sslConfig.rejectUnauthorized ? 'verify-full' : 'disable'
    
    if (!connectionString.includes('sslmode=')) {
      connectionString += (connectionString.includes('?') ? '&' : '?') + `sslmode=${sslMode}`
    } else {
      // Replace any existing sslmode with appropriate mode
      connectionString = connectionString.replace(/sslmode=[^&]*/, `sslmode=${sslMode}`)
    }
    
    console.log(`[ssl] Using sslmode=${sslMode} with rejectUnauthorized=${sslConfig.rejectUnauthorized}`)
    
    this.client = new Client({
      connectionString,
      ssl: sslConfig
    })
    
    this.auditRun = {
      startedAt: new Date(),
      status: 'running',
      priceDay: ''
    }
  }

  private getSSLConfig() {
    const caPem = process.env.SUPABASE_CA_PEM_BASE64
      ? Buffer.from(process.env.SUPABASE_CA_PEM_BASE64, 'base64').toString()
      : process.env.SUPABASE_CA_PEM

    if (process.env.NODE_ENV === 'production') {
      if (!caPem) {
        throw new Error('SUPABASE_CA_PEM_BASE64 is required in production')
      }
      console.log('[ssl] Production mode: Using secure SSL with CA verification')
      return {
        rejectUnauthorized: true,
        ca: caPem
      }
    } else {
      if (!caPem) {
        console.log('[ssl] ⚠️  WARNING: No Supabase CA certificate found!')
        console.log('[ssl] ⚠️  Using insecure SSL mode. This is NOT recommended for production.')
        console.log('[ssl] ⚠️  To fix: Download Supabase CA certificate and set SUPABASE_CA_PEM_BASE64 environment variable')
        return {
          rejectUnauthorized: false
        }
      } else {
        console.log('[ssl] Development mode: Using secure SSL with CA verification')
        return {
          rejectUnauthorized: true,
          ca: caPem
        }
      }
    }
  }

  private async connect() {
    await this.client.connect()
  }

  private async disconnect() {
    await this.client.end()
  }

  private async checkGatingState(): Promise<{ allowed: boolean; reason?: string }> {
    console.log(`[history] Checking gating state...`)
    
    try {
      // Get today's date in America/Santiago
      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd', { timeZone: 'America/Santiago' })
      
      // Check if stage was allowed today
      const result = await this.client.query(`
        SELECT value_boolean, value_date, updated_at
        FROM kv_state 
        WHERE key = 'last_stage_allowed'
      `)
      
      if (result.rows.length === 0) {
        return { allowed: false, reason: 'No gating state found - Stage may not have run' }
      }
      
      const gatingState = result.rows[0]
      const stageAllowed = gatingState.value_boolean
      const stageDate = gatingState.value_date
      
      // Convert stageDate to string format for comparison
      const stageDateStr = stageDate instanceof Date 
        ? format(stageDate, 'yyyy-MM-dd', { timeZone: 'America/Santiago' })
        : stageDate
      
      // Check if the date matches today
      if (stageDateStr !== todayStr) {
        return { allowed: false, reason: `Gating state is from ${stageDateStr}, expected ${todayStr}` }
      }
      
      if (!stageAllowed) {
        return { allowed: false, reason: 'Stage gating failed - consistency ratio outside acceptable range' }
      }
      
      console.log(`[history] ✅ Gating check passed - Stage allowed for ${todayStr}`)
      return { allowed: true }
      
    } catch (error) {
      console.error(`[history] Error checking gating state:`, error)
      return { allowed: false, reason: `Gating check failed: ${error instanceof Error ? error.message : String(error)}` }
    }
  }

  private async getPriceDay(): Promise<string> {
    // Get the price_day from the staging table
    const result = await this.client.query('SELECT DISTINCT price_day FROM scryfall_daily_prices_stage LIMIT 1')
    
    if (result.rows.length === 0) {
      throw new Error('No data found in staging table. Run stage-update first.')
    }
    
    const priceDay = result.rows[0].price_day
    this.auditRun.priceDay = priceDay
    
    console.log(`[ingest] Using price_day: ${priceDay}`)
    return priceDay
  }

  private async upsertHistory(): Promise<number> {
    const startTime = Date.now()
    
    console.log(`[ingest] Running set-based history upsert with UNION ALL...`)
    
    // Single set-based INSERT...SELECT with UNION ALL for all finishes
    const result = await this.client.query(`
      INSERT INTO mtgcard_price_history (scryfall_id, finish, price, price_at, source, price_day)
      SELECT 
        scryfall_id::uuid,
        'normal'::text,
        price_usd::numeric,
        NOW(),
        'scryfall',
        price_day::date
      FROM scryfall_daily_prices_stage
      WHERE price_usd IS NOT NULL
      
      UNION ALL
      
      SELECT 
        scryfall_id::uuid,
        'foil'::text,
        price_usd_foil::numeric,
        NOW(),
        'scryfall',
        price_day::date
      FROM scryfall_daily_prices_stage
      WHERE price_usd_foil IS NOT NULL
      
      UNION ALL
      
      SELECT 
        scryfall_id::uuid,
        'etched'::text,
        price_usd_etched::numeric,
        NOW(),
        'scryfall',
        price_day::date
      FROM scryfall_daily_prices_stage
      WHERE price_usd_etched IS NOT NULL
      
      ON CONFLICT (scryfall_id, finish, price_day) 
      DO UPDATE SET 
        price = EXCLUDED.price,
        price_at = EXCLUDED.price_at,
        source = EXCLUDED.source
    `)
    
    const duration = Date.now() - startTime
    console.log(`[ingest] ✅ Upserted ${result.rowCount} price history records in ${duration}ms`)
    
    return duration
  }

  private async logAuditRun(auditRun: AuditRun): Promise<number> {
    const query = `
      INSERT INTO ingestion_runs (
        started_at, completed_at, status, price_day,
        upsert_history_ms, history_upserts, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `
    
    const result = await this.client.query(query, [
      auditRun.startedAt,
      new Date(),
      auditRun.status,
      auditRun.priceDay,
      auditRun.upsertHistoryMs,
      auditRun.historyUpserts,
      auditRun.errorMessage
    ])
    
    return result.rows[0].id
  }

  async ingest(): Promise<HistoryUpsertResult> {
    const totalStartTime = Date.now()
    let runId: number | undefined
    
    try {
      await this.connect()
      
      console.log(`[ingest] Starting Vercel History Upsert...`)
      
      // Check gating state first
      const gatingCheck = await this.checkGatingState()
      if (!gatingCheck.allowed) {
        console.log(`[ingest] ⏭️  Skipping History Upsert: ${gatingCheck.reason}`)
        // Verification log for easy reading
        console.log(`[ok] dataset=history, paperOnly=N/A, ratio=N/A, allowed=false, skipped=true`)
        return {
          ok: true,
          skipped: true,
          durationMs: Date.now() - totalStartTime,
          runId: 0,
          historyUpserts: 0,
          skipReason: gatingCheck.reason
        }
      }
      
      // Get price day from staging table
      await this.getPriceDay()
      
      // Log the start of run with priceDay
      runId = await this.logAuditRun(this.auditRun)
      console.log(`[ingest] Started Vercel History Upsert run #${runId}`)
      
      // Upsert history records
      const upsertHistoryMs = await this.upsertHistory()
      
      // Get final count
      const historyCountResult = await this.client.query(`
        SELECT COUNT(*) 
        FROM mtgcard_price_history 
        WHERE price_day = $1 AND price_at >= NOW() - INTERVAL '1 minute'
      `, [this.auditRun.priceDay])
      
      const historyUpserts = parseInt(historyCountResult.rows[0].count)
      
      // Get rows staged today for comparison
      const stagedCountResult = await this.client.query(`
        SELECT COUNT(*) 
        FROM scryfall_daily_prices_stage
      `)
      const rowsStagedToday = parseInt(stagedCountResult.rows[0].count)
      
      // Calculate upserts per row ratio
      const upsertsPerRow = rowsStagedToday > 0 ? historyUpserts / rowsStagedToday : 0
      
      // Update audit run with results
      this.auditRun.status = 'completed'
      this.auditRun.upsertHistoryMs = upsertHistoryMs
      this.auditRun.historyUpserts = historyUpserts
      
      await this.logAuditRun(this.auditRun)
      
      const totalMs = Date.now() - totalStartTime
      
      console.log(`[ingest] 🎉 Vercel History Upsert completed!`)
      console.log(`[ingest] Run ID: #${runId}`)
      console.log(`[ingest] Upsert history: ${upsertHistoryMs}ms`)
      console.log(`[ingest] Total: ${totalMs}ms`)
      console.log(`[ingest] Rows staged today: ${rowsStagedToday.toLocaleString()}`)
      console.log(`[ingest] History upserts today: ${historyUpserts.toLocaleString()}`)
      console.log(`[ingest] Upserts per row: ${upsertsPerRow.toFixed(2)}`)
      console.log(`[ingest] Note: historyUpsertsToday ≤ 3 × rowsStagedToday (normal, foil, etched finishes)`)
      
      // Verification log for easy reading
      console.log(`[ok] dataset=history, paperOnly=N/A, ratio=N/A, allowed=true, skipped=false`)
      
      return {
        ok: true,
        skipped: false,
        durationMs: totalMs,
        historyUpserts,
        runId,
        rowsStagedToday,
        historyUpsertsToday: historyUpserts,
        upsertsPerRow
      }
      
    } catch (error: unknown) {
      const totalMs = Date.now() - totalStartTime
      console.error(`[ingest] ❌ Vercel History Upsert failed after ${totalMs}ms:`, error)
      
      // Update audit run with error
      this.auditRun.status = 'failed'
      this.auditRun.errorMessage = error instanceof Error ? error.message : String(error)
      
      if (runId) {
        await this.logAuditRun(this.auditRun)
      }
      
      return {
        ok: false,
        skipped: true,
        durationMs: totalMs,
        historyUpserts: 0,
        runId: runId || 0,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    } finally {
      await this.disconnect()
    }
  }
}

// CLI interface
async function main() {
  const pipeline = new VercelHistoryUpsertPipeline()
  const result = await pipeline.ingest()
  
  if (result.ok) {
    console.log('✅ Vercel History Upsert completed successfully')
  } else {
    console.log('❌ Vercel History Upsert failed')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
