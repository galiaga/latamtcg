#!/usr/bin/env tsx

/**
 * Generate Prices CSV from Scryfall bulk JSON
 *
 * - Downloads latest Scryfall bulk data if needed
 * - Input: data/scryfall-default-cards.json (Scryfall default-cards bulk)
 * - Output: stdout (CSV). Redirect to a file, e.g.: 
 *     npx tsx scripts/generate-prices-csv.ts > prices.csv
 * - Columns: scryfall_id,price_usd,price_usd_foil,price_usd_etched,price_day
 * - Memory efficient: streams the JSON file using stream-json
 */

import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'

// stream-json imports (types already present in repo under types/stream-json.d.ts)
import { chain } from 'stream-chain'
import { parser } from 'stream-json'
import { streamArray } from 'stream-json/streamers/StreamArray'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const INPUT_PATH = path.resolve(DATA_DIR, 'scryfall-default-cards.json')
const META_PATH = path.resolve(DATA_DIR, 'scryfall-download.meta.json')
const ETAG_PATH = path.resolve(DATA_DIR, 'scryfall-default.etag')

type ScryfallCard = {
  id: string
  prices?: {
    usd?: string | null
    usd_foil?: string | null
    usd_etched?: string | null
  }
}

type BulkDataInfo = {
  object: string
  id: string
  uri: string
  type: string
  name: string
  description: string
  download_uri: string
  updated_at: string
  content_type: string
  content_encoding: string
  size: number
}

function parseNumberOrNull(value: string | null | undefined): string {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  // Emit as plain number string (no quotes) for CSV numeric columns
  return String(n)
}

async function fetchBulkDataInfo(): Promise<BulkDataInfo> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'latamtcg-price-csv-generator/1.0',
        'Accept': 'application/json'
      }
    }
    
    https.get('https://api.scryfall.com/bulk-data', options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          
          if (!response.data || !Array.isArray(response.data)) {
            reject(new Error('Invalid API response: missing data array'))
            return
          }
          
          const defaultCards = response.data.find((item: any) => item.type === 'default_cards')
          if (!defaultCards) {
            reject(new Error('default_cards bulk data not found'))
            return
          }
          resolve(defaultCards)
        } catch (err) {
          reject(err)
        }
      })
    }).on('error', reject)
  })
}

async function downloadBulkData(downloadUri: string, outputPath: string): Promise<void> {
  console.error('📥 Downloading latest Scryfall bulk data...')
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath)
    const options = {
      headers: {
        'User-Agent': 'latamtcg-price-csv-generator/1.0',
        'Accept': 'application/json'
      }
    }
    
    https.get(downloadUri, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
        return
      }
      
      // Stream directly to file - Scryfall bulk data is uncompressed JSON
      res.pipe(file)
      
      file.on('finish', () => {
        console.error('✅ Download completed')
        resolve()
      })
      
      file.on('error', reject)
    }).on('error', reject)
  })
}

async function ensureLatestData(): Promise<void> {
  // Check if we need to download fresh data
  const needsDownload = !fs.existsSync(INPUT_PATH) || !fs.existsSync(META_PATH)
  
  if (needsDownload) {
    console.error('📊 Fetching bulk data info from Scryfall...')
    const bulkInfo = await fetchBulkDataInfo()
    
    console.error(`📅 Bulk data updated: ${bulkInfo.updated_at}`)
    console.error(`📦 Size: ${Math.round(bulkInfo.size / 1024 / 1024)}MB`)
    
    await downloadBulkData(bulkInfo.download_uri, INPUT_PATH)
    
    // Save metadata
    fs.writeFileSync(META_PATH, JSON.stringify({
      updatedAt: bulkInfo.updated_at,
      etag: bulkInfo.id,
      uri: bulkInfo.download_uri,
      size: bulkInfo.size
    }, null, 2))
    
    // Save ETag for future checks
    fs.writeFileSync(ETAG_PATH, bulkInfo.id)
  } else {
    console.error('📊 Checking if bulk data is current...')
    const bulkInfo = await fetchBulkDataInfo()
    const localMeta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'))
    
    if (bulkInfo.updated_at !== localMeta.updatedAt) {
      console.error(`📅 New bulk data available: ${bulkInfo.updated_at} (local: ${localMeta.updatedAt})`)
      console.error(`📦 Size: ${Math.round(bulkInfo.size / 1024 / 1024)}MB`)
      
      await downloadBulkData(bulkInfo.download_uri, INPUT_PATH)
      
      // Update metadata
      fs.writeFileSync(META_PATH, JSON.stringify({
        updatedAt: bulkInfo.updated_at,
        etag: bulkInfo.id,
        uri: bulkInfo.download_uri,
        size: bulkInfo.size
      }, null, 2))
      
      fs.writeFileSync(ETAG_PATH, bulkInfo.id)
    } else {
      console.error('✅ Bulk data is current')
    }
  }
}

async function main(): Promise<void> {
  const now = new Date()
  const priceDay = now.toISOString().slice(0, 10)

  // Ensure we have the latest bulk data
  await ensureLatestData()

  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input file not found: ${INPUT_PATH}`)
    process.exit(1)
  }

  console.error('📊 Generating CSV from bulk data...')
  
  // CSV header
  process.stdout.write('scryfall_id,price_usd,price_usd_foil,price_usd_etched,price_day\n')

  const streamPipeline = chain([
    fs.createReadStream(INPUT_PATH),
    parser(),
    streamArray(),
    async (data: any) => {
      const card = data.value as ScryfallCard
      const usd = parseNumberOrNull(card.prices?.usd)
      const usdFoil = parseNumberOrNull(card.prices?.usd_foil)
      const usdEtched = parseNumberOrNull(card.prices?.usd_etched)
      // CSV line (empty fields emit as empty)
      process.stdout.write(`${card.id},${usd},${usdFoil},${usdEtched},${priceDay}\n`)
    }
  ])

  return new Promise((resolve, reject) => {
    streamPipeline.on('error', reject)
    streamPipeline.on('end', () => {
      console.error('✅ CSV generation completed')
      resolve()
    })
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


