#!/usr/bin/env node
/*
  Build + start Next in production, hit /mtg/search, and report server render time.
*/
const { spawn } = require('child_process')

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function main() {
  const url = process.env.PERF_URL || 'http://localhost:3000/mtg/search?q=past+in+flames&rarity=rare'

  // Start server
  const env = { ...process.env, NODE_ENV: 'production' }
  const server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'start', '-p', '3000'], { env, stdio: ['ignore', 'pipe', 'pipe'] })

  let ready = false
  let renderMs = null
  let buf = ''
  const onData = (chunk) => {
    const s = chunk.toString()
    buf += s
    if (!ready && /started server/i.test(s)) ready = true
    for (const line of s.split(/\r?\n/)) {
      if (!line.trim().startsWith('{')) continue
      try {
        const obj = JSON.parse(line)
        if (obj && obj.event === 'page.render' && obj.route === '/mtg/search') {
          renderMs = Number(obj.ms || 0)
        }
      } catch {}
    }
  }
  server.stdout.on('data', onData)
  server.stderr.on('data', onData)

  // Wait for readiness banner
  const t0 = Date.now()
  for (let i = 0; i < 120 && !ready; i++) await sleep(250)
  if (!ready) {
    console.error('Server did not become ready in time')
    server.kill('SIGTERM')
    process.exit(1)
  }

  // Hit target URL
  const t1 = Date.now()
  try {
    const res = await fetch(url, { headers: { 'accept': 'text/html' } })
    await res.text()
  } catch (e) {
    console.error('Request failed', e)
  }
  const t2 = Date.now()

  // Give server a moment to flush logs
  await sleep(500)
  server.kill('SIGTERM')

  const reqMs = t2 - t1
  const bootMs = (t1 - t0)
  const out = { event: 'perf.prod', url, serverRenderMs: renderMs, requestMs: reqMs, serverBootMs: bootMs }
  console.log(JSON.stringify(out))
}

main().catch((e) => { console.error(e); process.exit(1) })


