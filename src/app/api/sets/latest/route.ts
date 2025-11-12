import { getLatestSets } from '@/lib/sets'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sets = await getLatestSets(8)
    const response = NextResponse.json(sets)
    // Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
    return response
  } catch (err) {
    console.error('[sets:latest] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

