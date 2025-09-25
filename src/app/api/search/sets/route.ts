import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = String(searchParams.get('q') || '').trim().toLowerCase()
    const limit = Math.min(500, Math.max(1, parseInt(String(searchParams.get('limit') || '200'), 10) || 200))

    const where: any = { isPaper: true, lang: 'en' }
    const rows: Array<{ setCode: string; setName: string | null; count: bigint }> = await prisma.$queryRaw(Prisma.sql`
      SELECT "setCode" AS "setCode", MIN("setName") AS "setName", COUNT(*)::bigint AS count
      FROM "public"."MtgCard"
      WHERE "isPaper" = true AND "lang" = 'en'
        ${q ? Prisma.sql`AND (lower("setCode") LIKE ${'%' + q + '%'} OR lower(COALESCE("setName", '')) LIKE ${'%' + q + '%'})` : Prisma.sql``}
      GROUP BY "setCode"
      ORDER BY MIN(COALESCE("setName", '')) ASC, "setCode" ASC
      LIMIT ${limit}
    `)

    const data = rows.map((r) => ({ code: r.setCode, name: r.setName || r.setCode, count: Number(r.count || 0) }))
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[search:sets] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


