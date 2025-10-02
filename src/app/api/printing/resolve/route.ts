export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const set = String(searchParams.get('set') || '').toLowerCase()
    const cn = String(searchParams.get('cn') || '')
    if (!set || !cn) return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
    const row = await prisma.mtgCard.findFirst({ where: { setCode: { equals: set, mode: 'insensitive' }, collectorNumber: cn }, select: { scryfallId: true } })
    if (row?.scryfallId) return NextResponse.json({ id: row.scryfallId })
    return NextResponse.json({ id: null })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}


