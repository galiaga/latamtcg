import { rebuildSearchIndex } from '@/services/searchIndex'

async function main() {
  const started = Date.now()
  
  console.log('[reindex] Starting search index rebuild...')
  const result = await rebuildSearchIndex()
  
  const ms = Date.now() - started
  console.log('[reindex] done', { 
    total: result.inserted, 
    indexed: result.inserted, 
    skipped: 0, 
    inserted: result.inserted, 
    durationMs: ms 
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


