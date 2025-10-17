import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPricingConfig, getBetaClpForDate } from '@/lib/pricingData'
import { pickAlpha, ceilToStep, computePriceCLP } from '@/lib/pricing'

const previewSchema = z.object({
  tcgUsd: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val > 0, {
    message: 'tcgUsd must be a positive number'
  })
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const result = previewSchema.safeParse({ tcgUsd: searchParams.get('tcgUsd') })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid tcgUsd parameter', details: result.error.errors },
        { status: 400 }
      )
    }

    const tcgUsd = result.data.tcgUsd
    const config = await getPricingConfig()
    const betaClp = await getBetaClpForDate()

    const alpha = pickAlpha(tcgUsd, {
      tcgPriceUsd: tcgUsd,
      fxClp: config.fxClp,
      alphaLow: config.alphaLow,
      alphaMid: config.alphaMid,
      alphaHigh: config.alphaHigh,
      alphaTierLowUsd: config.alphaTierLowUsd,
      alphaTierMidUsd: config.alphaTierMidUsd,
      betaClp,
      priceMinPerCardClp: config.priceMinPerCardClp,
      roundToStepClp: config.roundToStepClp
    })

    const baseClp = tcgUsd * config.fxClp
    const preFloor = baseClp * (1 + alpha) + betaClp
    const minPerCard = Math.max(config.priceMinPerCardClp, Math.ceil(preFloor))
    const finalClp = ceilToStep(minPerCard, config.roundToStepClp)

    return NextResponse.json({
      finalClp,
      alphaUsed: alpha,
      betaClp,
      fxClp: config.fxClp,
      baseClp,
      preFloor,
      minPerCard,
      step: config.roundToStepClp,
      breakdown: {
        tcgUsd,
        fxRate: config.fxClp,
        baseClp,
        alpha,
        markupClp: baseClp * alpha,
        betaClp,
        subtotalClp: baseClp + (baseClp * alpha) + betaClp,
        minPerCardClp: config.priceMinPerCardClp,
        finalClp
      }
    })
  } catch (error) {
    console.error('Pricing preview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
