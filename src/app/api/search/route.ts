import { NextRequest, NextResponse } from 'next/server'
import { searchSuggestions } from '@/services/searchQuery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = String(searchParams.get('q') || '')
    const game = String(searchParams.get('game') || 'mtg')
    const langParam = String(searchParams.get('lang') || '')
    const limitParam = String(searchParams.get('limit') || '')
    const lang = (langParam === 'all' ? 'all' : 'en') as 'en' | 'all'
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const items = await searchSuggestions({ q, game, lang, limit })
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[search] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


