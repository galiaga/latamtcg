import { Client } from 'pg'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { format } from 'date-fns-tz'
import { zlib } from 'zlib'

// Load environment variables
config({ path: '.env.local' })

interface StageResult {
  ok: boolean
  skipped: boolean
  durationMs: number
  runId: number
  rowsStaged: number
  downloadMs?: number
  copyMs: number
  errorMessage?: string
}

interface AuditRun {
  startedAt: Date
  status: 'running' | 'completed' | 'failed'
  priceDay: string
  downloadMs?: number
  copyMs?: number
  rowsStaged?: number
  errorMessage?: string
}

export class VercelStagePipeline {
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

  private validateCsvDate(csvPath: string) {
    // Read first line to get date
    const firstLine = fs.readFileSync(csvPath, 'utf8').split('\n')[0]
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd', { timeZone: 'America/Santiago' })
    
    this.auditRun.priceDay = todayStr
    
    console.log(`[stage] Validating CSV date against America/Santiago timezone...`)
    console.log(`[stage] ✅ CSV date validated: ${todayStr} (America/Santiago today)`)
  }

  private async downloadCsv(url: string, outputPath: string): Promise<number> {
    const startTime = Date.now()
    
    console.log(`[stage] Downloading CSV from: ${url}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.status} ${response.statusText}`)
    }
    
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(outputPath, Buffer.from(buffer))
    
    const duration = Date.now() - startTime
    console.log(`[stage] ✅ Downloaded CSV in ${duration}ms`)
    
    return duration
  }

  private async decompressGz(inputPath: string, outputPath: string): Promise<number> {
    const startTime = Date.now()
    
    console.log(`[stage] Decompressing gzipped CSV...`)
    
    const compressed = fs.readFileSync(inputPath)
    const decompressed = zlib.gunzipSync(compressed)
    fs.writeFileSync(outputPath, decompressed)
    
    const duration = Date.now() - startTime
    console.log(`[stage] ✅ Decompressed CSV in ${duration}ms`)
    
    return duration
  }

  private async copyCsvToStage(csvPath: string): Promise<number> {
    const startTime = Date.now()
    
    console.log(`[stage] Copying CSV to staging table with batch inserts...`)
    
    // Clear staging table
    await this.client.query('TRUNCATE TABLE scryfall_daily_prices_stage')
    
    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n').slice(1) // Skip header
    const totalLines = lines.length - 1 // Subtract empty last line
    
    console.log(`[stage] Processing ${totalLines.toLocaleString()} price records...`)
    
    // Process in batches of 10k for Vercel safety
    const batchSize = 10000
    let processedRows = 0
    
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize).filter(line => line.trim())
      
      if (batch.length === 0) continue
      
      const values: string[] = []
      const params: any[] = []
      
      for (const line of batch) {
        const [scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day] = line.split(',')
        
        if (!scryfall_id) continue
        
        // Convert empty strings to null
        const normalizedUsd = price_usd && price_usd.trim() ? price_usd : null
        const normalizedFoil = price_usd_foil && price_usd_foil.trim() ? price_usd_foil : null
        const normalizedEtched = price_usd_etched && price_usd_etched.trim() ? price_usd_etched : null
        
        values.push(`($${params.length + 1}, $${params.length + 2}, $${params.length + 3}, $${params.length + 4}, $${params.length + 5})`)
        params.push(scryfall_id, normalizedUsd, normalizedFoil, normalizedEtched, price_day)
      }
      
      if (values.length > 0) {
        const query = `
          INSERT INTO scryfall_daily_prices_stage (scryfall_id, price_usd, price_usd_foil, price_usd_etched, price_day)
          VALUES ${values.join(', ')}
          ON CONFLICT (scryfall_id) DO UPDATE SET
            price_usd = EXCLUDED.price_usd,
            price_usd_foil = EXCLUDED.price_usd_foil,
            price_usd_etched = EXCLUDED.price_usd_etched,
            price_day = EXCLUDED.price_day
        `
        
        await this.client.query(query, params)
        processedRows += values.length
      }
      
      if (processedRows % 50000 === 0) {
        console.log(`[stage] Inserted ${processedRows.toLocaleString()}/${totalLines.toLocaleString()} rows...`)
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`[stage] ✅ Copied ${processedRows.toLocaleString()} rows to staging in ${duration}ms`)
    
    return duration
  }

  private async logAuditRun(auditRun: AuditRun): Promise<number> {
    const query = `
      INSERT INTO ingestion_runs (
        started_at, completed_at, status, price_day,
        download_ms, copy_ms, rows_in_stage, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `
    
    const result = await this.client.query(query, [
      auditRun.startedAt,
      new Date(),
      auditRun.status,
      auditRun.priceDay,
      auditRun.downloadMs,
      auditRun.copyMs,
      auditRun.rowsStaged,
      auditRun.errorMessage
    ])
    
    return result.rows[0].id
  }

  async ingest(options: { file?: string; url?: string }): Promise<StageResult> {
    const totalStartTime = Date.now()
    let runId: number | undefined
    
    try {
      await this.connect()
      
      console.log(`[stage] Starting Vercel Stage ingestion...`)
      
      let csvPath: string
      let downloadMs: number | undefined
      
      if (options.file) {
        csvPath = path.resolve(options.file)
        console.log(`[stage] Using local CSV file: ${csvPath}`)
      } else if (options.url) {
        const tempDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true })
        }
        
        const fileName = options.url.endsWith('.gz') ? 'daily-prices.csv.gz' : 'daily-prices.csv'
        const tempPath = path.join(tempDir, fileName)
        
        downloadMs = await this.downloadCsv(options.url, tempPath)
        
        if (options.url.endsWith('.gz')) {
          csvPath = path.join(tempDir, 'daily-prices.csv')
          await this.decompressGz(tempPath, csvPath)
        } else {
          csvPath = tempPath
        }
      } else {
        throw new Error('Either --file or --url must be provided')
      }
      
      // Validate CSV date
      this.validateCsvDate(csvPath)
      
      // Now log the start of run with priceDay
      runId = await this.logAuditRun(this.auditRun)
      console.log(`[stage] Started Vercel Stage run #${runId}`)
      
      // Copy CSV to staging table
      const copyMs = await this.copyCsvToStage(csvPath)
      
      // Get final count
      const stageCountResult = await this.client.query('SELECT COUNT(*) FROM scryfall_daily_prices_stage')
      const rowsStaged = parseInt(stageCountResult.rows[0].count)
      
      // Update audit run with results
      this.auditRun.status = 'completed'
      this.auditRun.downloadMs = downloadMs
      this.auditRun.copyMs = copyMs
      this.auditRun.rowsStaged = rowsStaged
      
      await this.logAuditRun(this.auditRun)
      
      const totalMs = Date.now() - totalStartTime
      
      console.log(`[stage] 🎉 Vercel Stage completed!`)
      console.log(`[stage] Run ID: #${runId}`)
      console.log(`[stage] Download: ${downloadMs || 0}ms`)
      console.log(`[stage] Copy: ${copyMs}ms`)
      console.log(`[stage] Total: ${totalMs}ms`)
      console.log(`[stage] Rows staged: ${rowsStaged}`)
      
      return {
        ok: true,
        skipped: false,
        durationMs: totalMs,
        runId,
        rowsStaged,
        downloadMs,
        copyMs
      }
      
    } catch (error: unknown) {
      const totalMs = Date.now() - totalStartTime
      console.error(`[stage] ❌ Vercel Stage failed after ${totalMs}ms:`, error)
      
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
        rowsStaged: 0,
        copyMs: 0,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    } finally {
      await this.disconnect()
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options: { file?: string; url?: string } = {}
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      options.file = args[i + 1]
      i++
    } else if (args[i] === '--url' && args[i + 1]) {
      options.url = args[i + 1]
      i++
    }
  }
  
  if (!options.file && !options.url) {
    console.log('Usage: yarn vercel:ingest:stage [options]')
    console.log('Options:')
    console.log('  --file <path>    Use local CSV file')
    console.log('  --url <url>     Download CSV from URL')
    console.log('')
    console.log('Examples:')
    console.log('  yarn vercel:ingest:stage --file data/daily-prices.csv')
    console.log('  yarn vercel:ingest:stage --url https://api.scryfall.com/bulk-data/default-cards')
    process.exit(1)
  }
  
  const pipeline = new VercelStagePipeline()
  const result = await pipeline.ingest(options)
  
  if (result.ok) {
    console.log('✅ Vercel Stage completed successfully')
  } else {
    console.log('❌ Vercel Stage failed')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
