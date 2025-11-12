import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { RELEASE_CUTOFF } from '@/lib/db/constants'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    if (q.length < 2) {
      return NextResponse.json([])
    }

    // Use raw query to join with Set table and filter by release date
    const results = await prisma.$queryRaw<Array<{
      id: string
      title: string
      subtitle: string
      setCode: string
    }>>(
      Prisma.sql`
        SELECT DISTINCT
          si.id,
          si.title,
          si.subtitle,
          si."setCode"
        FROM "public"."SearchIndex" si
        JOIN "public"."MtgCard" mc ON mc."scryfallId" = si.id
        INNER JOIN "public"."Set" s ON upper(s.set_code) = upper(si."setCode")
        WHERE si.game = 'mtg'
          AND si."isPaper" = true
          AND s.released_at IS NOT NULL
          AND s.released_at <= ${RELEASE_CUTOFF}
          AND lower(s.set_name) NOT LIKE ${'%heroes of the realm%'}
          AND (
            si.title ILIKE ${'%' + q + '%'}
            OR si."keywordsText" ILIKE ${'%' + q + '%'}
          )
        ORDER BY si.title ASC
        LIMIT 8
      `
    )

    return NextResponse.json(results)
  } catch (err) {
    console.error('[search:suggest] failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

