import { Client } from 'pg'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { format } from 'date-fns-tz'
import { gunzipSync } from 'zlib'
import { downloadAndConvertToCsv } from './lib/scryfall-json-to-csv'

// Load environment variables
config({ path: '.env.local' })

interface StageResult {
  ok: boolean
  skipped: boolean
  durationMs: number
  runId: number
  rowsStaged: number
  downloadMs?: number
  convertMs?: number
  rowsInCsv?: number
  rowsInJson?: number
  rowsWrittenCsv?: number
  rowsFilteredOut?: number
  stageMs?: number
  copyMs: number
  datasetType?: string
  paperOnly?: boolean
  mtgCardCount?: number
  consistencyRatio?: number
  consistencyWarning?: string
  parseMode?: 'stream' | 'buffer'
  fallbackUsed?: boolean
  errorMessage?: string
}

interface AuditRun {
  startedAt: Date
  status: 'running' | 'completed' | 'failed'
  priceDay: string
  downloadMs?: number
  convertMs?: number
  rowsInCsv?: number
  rowsInJson?: number
  rowsWrittenCsv?: number
  stageMs?: number
  copyMs?: number
  rowsStaged?: number
  parseMode?: 'stream' | 'buffer'
  fallbackUsed?: boolean
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
        console.log('[ssl] ⚠️  WARNING: No Supabase CA certificate found in production!')
        console.log('[ssl] ⚠️  Using insecure SSL mode. This is NOT recommended for production.')
        console.log('[ssl] ⚠️  To fix: Set SUPABASE_CA_PEM_BASE64 environment variable')
        return {
          rejectUnauthorized: false
        }
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

  private async getScryfallBulkUrl(): Promise<string> {
    // Use configured URL or fetch from Scryfall API
    const configuredUrl = process.env.SCRYFALL_BULK_JSON_URL
    if (configuredUrl) {
      console.log(`[stage] Using configured Scryfall bulk URL: ${configuredUrl}`)
      return configuredUrl
    }

    // Get dataset type from environment variable
    const datasetType = process.env.SCRYFALL_BULK_DATASET || 'default_cards'
    
    // Validate dataset type
    if (!['default_cards', 'unique_prints'].includes(datasetType)) {
      throw new Error(`Invalid SCRYFALL_BULK_DATASET: ${datasetType}. Must be 'default_cards' or 'unique_prints'`)
    }

    console.log(`[stage] Fetching Scryfall bulk data info for dataset: ${datasetType}...`)
    const response = await fetch('https://api.scryfall.com/bulk-data', {
      headers: {
        'User-Agent': 'latamtcg-price-ingestion/1.0',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch bulk data info: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const targetDataset = data.data?.find((item: any) => item.type === datasetType)

    if (!targetDataset?.download_uri) {
      throw new Error(`${datasetType} bulk data not found`)
    }

    console.log(`[stage] Found Scryfall ${datasetType} URL: ${targetDataset.download_uri}`)
    return targetDataset.download_uri
  }

  private async connect() {
    await this.client.connect()
  }

  private async disconnect() {
    await this.client.end()
  }

  private async setGatingState(rowsStaged: number, mtgCardCount: number, paperOnly: boolean): Promise<void> {
    const ratio = rowsStaged / mtgCardCount
    const paperOnlyFilter = process.env.SCRYFALL_FILTER_PAPER_ONLY === 'true'
    
    // Set thresholds based on filter
    const lowerThreshold = paperOnlyFilter ? 0.95 : 0.90
    const upperThreshold = paperOnlyFilter ? 1.05 : 1.10
    
    const stageAllowed = ratio >= lowerThreshold && ratio <= upperThreshold
    const today = format(new Date(), 'yyyy-MM-dd', { timeZone: 'America/Santiago' })
    
    console.log(`[stage] Setting gating state: ratio=${ratio.toFixed(3)}, allowed=${stageAllowed}, thresholds=[${lowerThreshold}, ${upperThreshold}]`)
    
    // Upsert gating state
    await this.client.query(`
      INSERT INTO kv_state (key, value_boolean, value_numeric, value_date, updated_at)
      VALUES ('last_stage_allowed', $1, $2, $3, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value_boolean = EXCLUDED.value_boolean,
        value_numeric = EXCLUDED.value_numeric,
        value_date = EXCLUDED.value_date,
        updated_at = EXCLUDED.updated_at
    `, [stageAllowed, ratio, today])
    
    // Also store the ratio separately for easy access
    await this.client.query(`
      INSERT INTO kv_state (key, value_numeric, updated_at)
      VALUES ('last_stage_ratio', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value_numeric = EXCLUDED.value_numeric,
        updated_at = EXCLUDED.updated_at
    `, [ratio])
  }

  private async checkDbConsistency(rowsStaged: number): Promise<{ mtgCardCount: number; warning?: string }> {
    console.log(`[stage] Running DB consistency checks...`)
    
    // Get count of cards in MtgCard table
    const mtgCardResult = await this.client.query('SELECT COUNT(*) FROM "MtgCard"')
    const mtgCardCount = parseInt(mtgCardResult.rows[0].count)
    
    console.log(`[stage] MtgCard count: ${mtgCardCount.toLocaleString()}`)
    console.log(`[stage] Rows staged: ${rowsStaged.toLocaleString()}`)
    
    // Check consistency (within 5% tolerance)
    const lowerBound = Math.floor(mtgCardCount * 0.95)
    const upperBound = Math.ceil(mtgCardCount * 1.05)
    
    if (rowsStaged < lowerBound || rowsStaged > upperBound) {
      const warning = `DB consistency warning: staged rows (${rowsStaged}) outside expected range (${lowerBound}-${upperBound}) for MtgCard count (${mtgCardCount})`
      console.warn(`[stage] ⚠️  ${warning}`)
      return { mtgCardCount, warning }
    }
    
    console.log(`[stage] ✅ DB consistency check passed`)
    return { mtgCardCount }
  }

  private validateCsvDate(csvPath: string) {
    // Read first line to get date
    const firstLine = fs.readFileSync(csvPath, 'utf8').split('\n')[0]
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd', { timeZone: 'America/Santiago' })

    this.auditRun.priceDay = todayStr

    console.log(`[stage] Validating CSV date against America/Santiago timezone...`)
    
    // Extract price_day from CSV header or first data row
    const lines = fs.readFileSync(csvPath, 'utf8').split('\n')
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or malformed')
    }
    
    // Check if first data row has the correct price_day
    const firstDataRow = lines[1] // Skip header
    const priceDayFromCsv = firstDataRow.split(',').pop()?.trim()
    
    if (priceDayFromCsv !== todayStr) {
      throw new Error(`Price day mismatch: CSV has '${priceDayFromCsv}', expected '${todayStr}' (America/Santiago today)`)
    }

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
    const decompressed = gunzipSync(compressed)
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
      let convertMs: number | undefined
      let rowsInCsv: number | undefined
      let rowsInJson: number | undefined
      let rowsWrittenCsv: number | undefined
      let rowsFilteredOut: number | undefined
      let stageMs: number | undefined
      let parseMode: 'stream' | 'buffer' | undefined
      let fallbackUsed: boolean | undefined
      
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
        // Auto-detect and convert Scryfall JSON to CSV
        console.log(`[stage] No file/url provided, auto-converting Scryfall JSON to CSV...`)
        
        const bulkUrl = await this.getScryfallBulkUrl()
        const today = new Date()
        const priceDay = format(today, 'yyyy-MM-dd', { timeZone: 'America/Santiago' })
        
        console.log(`[stage] Converting Scryfall JSON to CSV for ${priceDay}...`)
        const convertStartTime = Date.now()
        
        const result = await downloadAndConvertToCsv(bulkUrl, priceDay)
        csvPath = result.csvPath
        rowsInCsv = result.rowCount
        rowsInJson = result.rowsInJson
        rowsWrittenCsv = result.rowsWrittenCsv
        rowsFilteredOut = result.rowsFilteredOut
        parseMode = result.parseMode
        fallbackUsed = result.fallbackUsed
        
        convertMs = Date.now() - convertStartTime
        
               // Safety check: abort if too few rows (default_cards should have ~110k+ rows)
               if (rowsInCsv < 100000) {
                 throw new Error(`Abnormally low row count: ${rowsInCsv}. Expected ~110k+ rows from default_cards. Check bulk data URL.`)
               }
        
        console.log(`[stage] ✅ Converted ${rowsInCsv.toLocaleString()} cards to CSV in ${convertMs}ms`)
      }
      
      // Validate CSV date
      this.validateCsvDate(csvPath)
      
      // Now log the start of run with priceDay
      runId = await this.logAuditRun(this.auditRun)
      console.log(`[stage] Started Vercel Stage run #${runId}`)
      
      // Copy CSV to staging table
      const stageStartTime = Date.now()
      const copyMs = await this.copyCsvToStage(csvPath)
      stageMs = Date.now() - stageStartTime
      
      // Get final count
      const stageCountResult = await this.client.query('SELECT COUNT(*) FROM scryfall_daily_prices_stage')
      const rowsStaged = parseInt(stageCountResult.rows[0].count)
      
      // Run DB consistency checks
      const datasetType = process.env.SCRYFALL_BULK_DATASET || 'default_cards'
      const paperOnly = process.env.SCRYFALL_FILTER_PAPER_ONLY === 'true'
      const consistencyCheck = await this.checkDbConsistency(rowsStaged)
      
      // Set gating state for Update/History steps
      await this.setGatingState(rowsStaged, consistencyCheck.mtgCardCount, paperOnly)
      
      // Calculate consistency ratio
      const consistencyRatio = rowsStaged / consistencyCheck.mtgCardCount
      
      // Update audit run with results
      this.auditRun.status = 'completed' // Always use 'completed' for DB constraint
      this.auditRun.downloadMs = downloadMs
      this.auditRun.convertMs = convertMs
      this.auditRun.rowsInCsv = rowsInCsv
      this.auditRun.rowsInJson = rowsInJson
      this.auditRun.rowsWrittenCsv = rowsWrittenCsv
      this.auditRun.stageMs = stageMs
      this.auditRun.copyMs = copyMs
      this.auditRun.rowsStaged = rowsStaged
      this.auditRun.parseMode = parseMode
      this.auditRun.fallbackUsed = fallbackUsed
      
      await this.logAuditRun(this.auditRun)
      
      const totalMs = Date.now() - totalStartTime
      
      console.log(`[stage] 🎉 Vercel Stage completed!`)
      console.log(`[stage] Run ID: #${runId}`)
      console.log(`[stage] Dataset: ${datasetType}`)
      console.log(`[stage] Paper-only filter: ${paperOnly}`)
      console.log(`[stage] Parse mode: ${parseMode || 'N/A'}`)
      console.log(`[stage] Fallback used: ${fallbackUsed || false}`)
      console.log(`[stage] Download: ${downloadMs || 0}ms`)
      console.log(`[stage] Convert: ${convertMs || 0}ms`)
      console.log(`[stage] Stage: ${stageMs || 0}ms`)
      console.log(`[stage] Total: ${totalMs}ms`)
      console.log(`[stage] Rows in JSON: ${rowsInJson || 'N/A'}`)
      console.log(`[stage] Rows written CSV: ${rowsWrittenCsv || 'N/A'}`)
      console.log(`[stage] Rows filtered out: ${rowsFilteredOut || 0}`)
      console.log(`[stage] Rows staged: ${rowsStaged}`)
      console.log(`[stage] MtgCard count: ${consistencyCheck.mtgCardCount}`)
      console.log(`[stage] Consistency ratio: ${consistencyRatio.toFixed(3)}`)
      if (consistencyCheck.warning) {
        console.log(`[stage] ⚠️  Consistency warning: ${consistencyCheck.warning}`)
      }
      
      // Verification log for easy reading
      const allowed = consistencyRatio >= 0.95 && consistencyRatio <= 1.05
      console.log(`[ok] dataset=${datasetType}, paperOnly=${paperOnly}, parseMode=${parseMode || 'N/A'}, fallbackUsed=${fallbackUsed || false}, ratio=${consistencyRatio.toFixed(3)}, allowed=${allowed}, skipped=false`)
      
      return {
        ok: true,
        skipped: false,
        durationMs: totalMs,
        runId,
        rowsStaged,
        downloadMs,
        convertMs,
        rowsInCsv,
        rowsInJson,
        rowsWrittenCsv,
        rowsFilteredOut,
        stageMs,
        copyMs,
        datasetType,
        paperOnly,
        mtgCardCount: consistencyCheck.mtgCardCount,
        consistencyRatio,
        consistencyWarning: consistencyCheck.warning,
        parseMode,
        fallbackUsed
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
    console.log('  (no args)       Auto-convert Scryfall JSON to CSV')
    console.log('')
    console.log('Examples:')
    console.log('  yarn vercel:ingest:stage --file data/daily-prices.csv')
    console.log('  yarn vercel:ingest:stage --url https://api.scryfall.com/bulk-data/default-cards')
    console.log('  yarn vercel:ingest:stage  # Auto-convert Scryfall JSON')
    console.log('')
    console.log('Auto-conversion mode: Downloading Scryfall JSON and converting to CSV...')
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
