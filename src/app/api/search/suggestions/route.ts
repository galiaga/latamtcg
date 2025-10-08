import { NextRequest, NextResponse } from 'next/server'
import { searchSuggestions } from '@/services/searchQuery'
import { cacheGetJSON, cacheSetJSON } from '@/lib/cache'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    const q = String(searchParams.get('q') || '')
    const limit = Math.min(50, Math.max(1, parseInt(String(searchParams.get('limit') || '15'), 10) || 15))
    const game = String(searchParams.get('game') || 'mtg')
    const lang = String(searchParams.get('lang') || 'en')
    
    if (!q.trim()) {
      return NextResponse.json([])
    }
    
    // More granular cache key for better hit rates
    const normalizedQuery = q.trim().toLowerCase()
    const key = `suggestions:${game}:${lang}:${normalizedQuery}:${limit}`
    const ttl = 1800 // 30 minutes cache (suggestions change infrequently)
    
    try {
      const cached = await cacheGetJSON(key)
      if (cached) {
        return NextResponse.json(cached)
      }
    } catch {}
    
    const result = await searchSuggestions({ q, limit, game, lang: lang as 'en' | 'all' })
    
    cacheSetJSON(key, result, ttl).catch(() => {})
    
    return NextResponse.json(result, { 
      headers: { 
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' 
      } 
    })
  } catch (err) {
    console.error('[search:suggestions] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
