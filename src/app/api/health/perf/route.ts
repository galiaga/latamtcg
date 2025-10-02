import { NextResponse } from 'next/server'

// In-memory ring buffers for last N metrics in dev
const N = 100
const store: Record<string, number[]> = Object.create(null)

function add(name: string, ms: number) {
  if (!store[name]) store[name] = []
  const arr = store[name]
  arr.push(ms)
  if (arr.length > N) arr.shift()
}

export async function GET() {
  // No-op filler: metrics are pushed via console logs elsewhere. This endpoint simply returns the current buffers.
  const summary: Record<string, { p50: number; p95: number; count: number }> = {}
  for (const [k, arr] of Object.entries(store)) {
    const sorted = arr.slice().sort((a, b) => a - b)
    const p = (q: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] : 0
    summary[k] = { p50: p(0.5), p95: p(0.95), count: sorted.length }
  }
  return NextResponse.json({ summary })
}


