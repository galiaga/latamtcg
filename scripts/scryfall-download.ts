/* eslint-disable no-console */
import 'dotenv/config'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

type BulkMeta = {
  id: string
  type: string
  updated_at: string
  download_uri: string
}

async function fetchBulkIndex(): Promise<{ uri: string; updatedAt: string }> {
  const BULK_INDEX_URL = 'https://api.scryfall.com/bulk-data'
  const res = await fetch(BULK_INDEX_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch bulk index: ${res.status} ${res.statusText}`)
  const json = await res.json() as { data: BulkMeta[] }
  const entry = json.data.find((b) => b.type === 'default_cards')
  if (!entry) throw new Error('default_cards not found in Scryfall bulk-data')
  return { uri: entry.download_uri, updatedAt: entry.updated_at }
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function runCurl(uri: string, outputFile: string, etagFile: string): Promise<{ etag: string | null }> {
  return new Promise((resolve, reject) => {
    const args = [
      '-L',
      '--retry', '8',
      '--retry-all-errors',
      '--retry-delay', '2',
      '-C', '-',
      '--etag-save', etagFile,
      '--etag-compare', etagFile,
      '-o', outputFile,
      uri,
    ]
    const child = spawn('curl', args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`curl exited with code ${code}`))
      let etag: string | null = null
      try {
        if (fs.existsSync(etagFile)) {
          etag = fs.readFileSync(etagFile, 'utf8').trim() || null
        }
      } catch {}
      resolve({ etag })
    })
  })
}

async function main() {
  try {
    const dataDir = path.resolve('data')
    ensureDir(dataDir)
    const ndjsonDir = path.join(dataDir, 'ndjson')
    ensureDir(ndjsonDir)

    const { uri, updatedAt } = await fetchBulkIndex()
    const isGz = uri.endsWith('.gz')
    const downloadFile = path.join(dataDir, isGz ? 'scryfall-default-cards.json.gz' : 'scryfall-default-cards.json')
    const etagFile = path.join(dataDir, 'scryfall-default.etag')
    const metaFile = path.join(dataDir, 'scryfall-download.meta.json')

    console.log('[scryfall] Downloading (resumable):', uri)
    const { etag } = await runCurl(uri, downloadFile, etagFile)

    // If etag compare determined file is fresh, curl still exits 0 but may not overwrite; we proceed to write meta reflecting current known state
    const meta = { updatedAt, etag, uri }
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2))
    console.log('[scryfall] Wrote meta to', metaFile)
    console.log('[scryfall] Download complete:', downloadFile)
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()



