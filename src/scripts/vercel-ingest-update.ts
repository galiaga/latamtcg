import { Client } from 'pg'
import { config } from 'dotenv'
import { format } from 'date-fns-tz'

// Load environment variables
config({ path: '.env.local' })

interface UpdateResult {
  ok: boolean
  skipped: boolean
  durationMs: number
  runId: number
  cardsUpdated: number
  cardsMatched: number
  updateMs: number
  skipReason?: string
  errorMessage?: string
}

interface AuditRun {
  startedAt: Date
  status: 'running' | 'completed' | 'failed'
  priceDay: string
  updateMs?: number
  cardsUpdated?: number
  cardsMatched?: number
  errorMessage?: string
}

export class VercelUpdatePipeline {
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
    console.log(`[update] Checking gating state...`)
    
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
      
      console.log(`[update] ✅ Gating check passed - Stage allowed for ${todayStr}`)
      return { allowed: true }
      
    } catch (error) {
      console.error(`[update] Error checking gating state:`, error)
      return { allowed: false, reason: `Gating check failed: ${error instanceof Error ? error.message : String(error)}` }
    }
  }

  private async getPriceDay(): Promise<string> {
    // Get the price_day from the staging table
    const result = await this.client.query('SELECT DISTINCT price_day FROM scryfall_daily_prices_stage LIMIT 1')
    
    if (result.rows.length === 0) {
      throw new Error('No data found in staging table. Run stage first.')
    }
    
    const priceDay = result.rows[0].price_day
    this.auditRun.priceDay = priceDay
    
    console.log(`[update] Using price_day: ${priceDay}`)
    return priceDay
  }

  private async updateCards(): Promise<{ updateMs: number; cardsMatched: number }> {
    const startTime = Date.now()
    
    console.log(`[update] Running set-based UPDATE with IS DISTINCT FROM guard...`)
    
    // First, count how many cards would be matched (for consistency check)
    const matchCountResult = await this.client.query(`
      SELECT COUNT(*) FROM "MtgCard" m
      JOIN scryfall_daily_prices_stage s ON m."scryfallId" = s.scryfall_id::text
    `)
    const cardsMatched = parseInt(matchCountResult.rows[0].count)
    
    console.log(`[update] Cards matched for update: ${cardsMatched.toLocaleString()}`)
    
    // Update cards with new prices using IS DISTINCT FROM to avoid no-op updates
    const result = await this.client.query(`
      UPDATE "MtgCard" m
      SET
        "priceUsd"       = s.price_usd,
        "priceUsdFoil"   = s.price_usd_foil,
        "priceUsdEtched" = s.price_usd_etched,
        "priceUpdatedAt" = NOW()
      FROM scryfall_daily_prices_stage s
      WHERE m."scryfallId" = s.scryfall_id::text
        AND (
          m."priceUsd"       IS DISTINCT FROM s.price_usd OR
          m."priceUsdFoil"   IS DISTINCT FROM s.price_usd_foil OR
          m."priceUsdEtched" IS DISTINCT FROM s.price_usd_etched
        )
    `)
    
    const duration = Date.now() - startTime
    console.log(`[update] ✅ Updated ${result.rowCount} cards in ${duration}ms`)
    
    // Log consistency ratio
    const stagedCountResult = await this.client.query('SELECT COUNT(*) FROM scryfall_daily_prices_stage')
    const rowsStaged = parseInt(stagedCountResult.rows[0].count)
    const matchRatio = cardsMatched / rowsStaged
    
    console.log(`[update] Consistency ratio: ${cardsMatched.toLocaleString()}/${rowsStaged.toLocaleString()} = ${(matchRatio * 100).toFixed(1)}%`)
    
    if (matchRatio < 0.95) {
      console.warn(`[update] ⚠️  Low match ratio: ${(matchRatio * 100).toFixed(1)}% (expected ≥95%)`)
    }
    
    return { updateMs: duration, cardsMatched }
  }

  private async logAuditRun(auditRun: AuditRun): Promise<number> {
    const query = `
      INSERT INTO ingestion_runs (
        started_at, completed_at, status, price_day,
        update_cards_ms, cards_updated, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `
    
    const result = await this.client.query(query, [
      auditRun.startedAt,
      new Date(),
      auditRun.status,
      auditRun.priceDay,
      auditRun.updateMs,
      auditRun.cardsUpdated,
      auditRun.errorMessage
    ])
    
    return result.rows[0].id
  }

  async ingest(): Promise<UpdateResult> {
    const totalStartTime = Date.now()
    let runId: number | undefined
    
    try {
      await this.connect()
      
      console.log(`[update] Starting Vercel Update...`)
      
      // Check gating state first
      const gatingCheck = await this.checkGatingState()
      if (!gatingCheck.allowed) {
        console.log(`[update] ⏭️  Skipping Update: ${gatingCheck.reason}`)
        // Verification log for easy reading
        console.log(`[ok] dataset=update, paperOnly=N/A, ratio=N/A, allowed=false, skipped=true`)
        return {
          ok: true,
          skipped: true,
          durationMs: Date.now() - totalStartTime,
          runId: 0,
          cardsUpdated: 0,
          cardsMatched: 0,
          updateMs: 0,
          skipReason: gatingCheck.reason
        }
      }
      
      // Get price day from staging table
      await this.getPriceDay()
      
      // Log the start of run with priceDay
      runId = await this.logAuditRun(this.auditRun)
      console.log(`[update] Started Vercel Update run #${runId}`)
      
      // Update cards
      const updateResult = await this.updateCards()
      const updateMs = updateResult.updateMs
      const cardsMatched = updateResult.cardsMatched
      
      // Get final count
      const cardsCountResult = await this.client.query('SELECT COUNT(*) FROM "MtgCard" WHERE "priceUpdatedAt" >= NOW() - INTERVAL \'1 minute\'')
      const cardsUpdated = parseInt(cardsCountResult.rows[0].count)
      
      // Update audit run with results
      this.auditRun.status = 'completed'
      this.auditRun.updateMs = updateMs
      this.auditRun.cardsUpdated = cardsUpdated
      this.auditRun.cardsMatched = cardsMatched
      
      await this.logAuditRun(this.auditRun)
      
      const totalMs = Date.now() - totalStartTime
      
      console.log(`[update] 🎉 Vercel Update completed!`)
      console.log(`[update] Run ID: #${runId}`)
      console.log(`[update] Update cards: ${updateMs}ms`)
      console.log(`[update] Total: ${totalMs}ms`)
      console.log(`[update] Cards matched: ${cardsMatched.toLocaleString()}`)
      console.log(`[update] Cards updated: ${cardsUpdated}`)
      console.log(`[update] Note: cardsUpdated can be 0 even on success if no prices changed`)
      
      // Verification log for easy reading
      console.log(`[ok] dataset=update, paperOnly=N/A, ratio=N/A, allowed=true, skipped=false`)
      
      return {
        ok: true,
        skipped: false,
        durationMs: totalMs,
        runId,
        cardsUpdated,
        cardsMatched,
        updateMs
      }
      
    } catch (error: unknown) {
      const totalMs = Date.now() - totalStartTime
      console.error(`[update] ❌ Vercel Update failed after ${totalMs}ms:`, error)
      
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
        runId: runId || 0,
        cardsUpdated: 0,
        cardsMatched: 0,
        updateMs: 0,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    } finally {
      await this.disconnect()
    }
  }
}

// CLI interface
async function main() {
  const pipeline = new VercelUpdatePipeline()
  const result = await pipeline.ingest()
  
  if (result.ok) {
    console.log('✅ Vercel Update completed successfully')
  } else {
    console.log('❌ Vercel Update failed')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
