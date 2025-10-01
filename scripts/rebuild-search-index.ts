import { rebuildSearchIndex } from '@/services/searchIndex'

async function main() {
  const started = Date.now()
  const result = await rebuildSearchIndex()
  const duration = Date.now() - started
  console.log('[searchindex] rebuilt', { ...result, durationMs: duration })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


