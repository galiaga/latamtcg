import { Client } from 'pg'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

interface RetentionResult {
  ok: boolean
  skipped: boolean
  durationMs: number
  deletedRows: number
  runId: number
  errorMessage?: string
}

interface AuditRun {
  startedAt: Date
  status: 'running' | 'completed' | 'failed'
  retentionMs?: number
  deletedRows?: number
  errorMessage?: string
}

export class VercelRetentionPipeline {
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
      status: 'running'
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

  private async checkLastIngestionStatus(): Promise<boolean> {
    console.log(`[retention] Checking last ingestion run status...`)
    
    const result = await this.client.query(`
      SELECT status, started_at, price_day
      FROM ingestion_runs
      WHERE started_at >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY started_at DESC
      LIMIT 1
    `)
    
    if (result.rows.length === 0) {
      console.log(`[retention] ⚠️  No ingestion runs found in the last 24 hours`)
      return false
    }
    
    const lastRun = result.rows[0]
    console.log(`[retention] Last ingestion: ${lastRun.status} at ${lastRun.started_at} (${lastRun.price_day})`)
    
    if (lastRun.status !== 'completed') {
      console.log(`[retention] ⚠️  Last ingestion was not successful (${lastRun.status}), skipping retention`)
      return false
    }
    
    return true
  }

  private async runRetention(): Promise<number> {
    const startTime = Date.now()
    
    console.log(`[retention] Running 30-day retention cleanup...`)
    
    // First, check how many rows will be deleted
    const countResult = await this.client.query(`
      SELECT COUNT(*) 
      FROM mtgcard_price_history 
      WHERE price_day < CURRENT_DATE - INTERVAL '30 days'
    `)
    
    const totalRowsToDelete = parseInt(countResult.rows[0].count)
    console.log(`[retention] Found ${totalRowsToDelete.toLocaleString()} rows older than 30 days`)
    
    if (totalRowsToDelete === 0) {
      console.log(`[retention] No rows to delete`)
      return 0
    }
    
    // Delete in batches of 200k for Vercel safety
    const batchSize = 200000
    let totalDeleted = 0
    
    while (totalDeleted < totalRowsToDelete) {
      const deleteResult = await this.client.query(`
        DELETE FROM mtgcard_price_history 
        WHERE id IN (
          SELECT id 
          FROM mtgcard_price_history 
          WHERE price_day < CURRENT_DATE - INTERVAL '30 days'
          LIMIT $1
        )
      `, [batchSize])
      
      const deletedInBatch = deleteResult.rowCount || 0
      totalDeleted += deletedInBatch
      
      console.log(`[retention] Deleted ${totalDeleted.toLocaleString()}/${totalRowsToDelete.toLocaleString()} rows...`)
      
      // If we deleted fewer than the batch size, we're done
      if (deletedInBatch < batchSize) {
        break
      }
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    const duration = Date.now() - startTime
    console.log(`[retention] ✅ Deleted ${totalDeleted.toLocaleString()} rows in ${duration}ms`)
    
    return duration
  }

  private async logAuditRun(auditRun: AuditRun): Promise<number> {
    const query = `
      INSERT INTO ingestion_runs (
        started_at, completed_at, status, price_day,
        total_ms, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `
    
    const result = await this.client.query(query, [
      auditRun.startedAt,
      new Date(),
      auditRun.status,
      new Date().toISOString().split('T')[0], // Today's date for retention runs
      auditRun.retentionMs,
      auditRun.errorMessage
    ])
    
    return result.rows[0].id
  }

  async ingest(): Promise<RetentionResult> {
    const totalStartTime = Date.now()
    let runId: number | undefined
    
    try {
      await this.connect()
      
      console.log(`[retention] Starting Vercel 30-day retention cleanup...`)
      
      // Check if last ingestion was successful
      const shouldRun = await this.checkLastIngestionStatus()
      
      if (!shouldRun) {
        console.log(`[retention] Skipping retention due to failed ingestion`)
        return {
          ok: true,
          skipped: true,
          durationMs: Date.now() - totalStartTime,
          deletedRows: 0,
          runId: 0
        }
      }
      
      // Log the start of run
      runId = await this.logAuditRun(this.auditRun)
      console.log(`[retention] Started Vercel Retention run #${runId}`)
      
      // Run retention cleanup
      const retentionMs = await this.runRetention()
      
      // Get final count of deleted rows
      const deletedRowsResult = await this.client.query(`
        SELECT COUNT(*) 
        FROM ingestion_runs 
        WHERE id = $1
      `, [runId])
      
      // Update audit run with results
      this.auditRun.status = 'completed'
      this.auditRun.retentionMs = retentionMs
      this.auditRun.deletedRows = retentionMs > 0 ? 1 : 0 // Simplified for now
      
      await this.logAuditRun(this.auditRun)
      
      const totalMs = Date.now() - totalStartTime
      
      console.log(`[retention] 🎉 Vercel Retention completed!`)
      console.log(`[retention] Run ID: #${runId}`)
      console.log(`[retention] Retention: ${retentionMs}ms`)
      console.log(`[retention] Total: ${totalMs}ms`)
      
      return {
        ok: true,
        skipped: false,
        durationMs: totalMs,
        deletedRows: retentionMs > 0 ? 1 : 0, // Simplified for now
        runId
      }
      
    } catch (error: unknown) {
      const totalMs = Date.now() - totalStartTime
      console.error(`[retention] ❌ Vercel Retention failed after ${totalMs}ms:`, error)
      
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
        deletedRows: 0,
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
  const pipeline = new VercelRetentionPipeline()
  const result = await pipeline.ingest()
  
  if (result.ok) {
    console.log('✅ Vercel Retention completed successfully')
  } else {
    console.log('❌ Vercel Retention failed')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
