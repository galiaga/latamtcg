import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPricingConfig, getBetaClpForDate } from '@/lib/pricingData'
import { computePriceCLP } from '@/lib/pricing'

const adminToken = process.env.ADMIN_TOKEN

function verifyAdminToken(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === adminToken
}

export async function POST(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await getPricingConfig()
    const betaClp = await getBetaClpForDate()

    const inputs = {
      fxClp: config.fxClp,
      alphaLow: config.alphaLow,
      alphaMid: config.alphaMid,
      alphaHigh: config.alphaHigh,
      alphaTierLowUsd: config.alphaTierLowUsd,
      alphaTierMidUsd: config.alphaTierMidUsd,
      betaClp,
      priceMinPerCardClp: config.priceMinPerCardClp,
      roundToStepClp: config.roundToStepClp
    }

    // Get total count for progress tracking
    const totalCards = await prisma.mtgCard.count({
      where: {
        priceUsd: { not: null }
      }
    })

    if (totalCards === 0) {
      return NextResponse.json({
        message: 'No cards with USD prices found',
        processed: 0,
        total: 0
      })
    }

    // Process in batches to avoid timeouts
    const batchSize = 1000
    let processed = 0
    let offset = 0

    while (offset < totalCards) {
      const cards = await prisma.mtgCard.findMany({
        where: {
          priceUsd: { not: null }
        },
        select: {
          id: true,
          priceUsd: true
        },
        skip: offset,
        take: batchSize
      })

      if (cards.length === 0) break

      // Calculate CLP prices for this batch
      const updates = cards.map(card => ({
        id: card.id,
        computedPriceClp: computePriceCLP(Number(card.priceUsd), {
          tcgPriceUsd: Number(card.priceUsd),
          ...inputs
        })
      }))

      // Batch update
      await Promise.all(
        updates.map(update =>
          prisma.mtgCard.update({
            where: { id: update.id },
            data: { computedPriceClp: update.computedPriceClp }
          })
        )
      )

      processed += cards.length
      offset += batchSize

      // Log progress
      console.log(`Repriced ${processed}/${totalCards} cards`)
    }

    return NextResponse.json({
      message: 'Repricing completed successfully',
      processed,
      total: totalCards,
      config: {
        fxClp: config.fxClp,
        betaClp,
        priceMinPerCardClp: config.priceMinPerCardClp,
        roundToStepClp: config.roundToStepClp
      }
    })
  } catch (error) {
    console.error('Reprice error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
