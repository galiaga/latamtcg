/**
 * Data access functions for pricing configuration and daily shipping
 */

import { prisma } from './prisma'
import { PricingInputs, computePriceCLP } from './pricing'

export type PricingConfig = {
  id: string
  useCLP: boolean
  fxClp: number
  alphaTierLowUsd: number
  alphaTierMidUsd: number
  alphaLow: number
  alphaMid: number
  alphaHigh: number
  priceMinPerCardClp: number
  roundToStepClp: number
  minOrderSubtotalClp: number
  shippingFlatClp: number
  freeShippingThresholdClp: number | null
  updatedAt: Date
  createdAt: Date
}

export type DailyShipping = {
  id: string
  date: Date
  totalShippingUsd: number
  cardsCount: number
  notes: string | null
  createdAt: Date
}

/**
 * Gets the current pricing configuration, creating default if none exists
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  let config = await prisma.pricingConfig.findFirst({
    orderBy: { createdAt: 'desc' }
  })

  if (!config) {
    // Create default configuration
    config = await prisma.pricingConfig.create({
      data: {
        useCLP: true,
        fxClp: 950,
        alphaTierLowUsd: 5,
        alphaTierMidUsd: 20,
        alphaLow: 0.9,
        alphaMid: 0.7,
        alphaHigh: 0.5,
        priceMinPerCardClp: 500,
        roundToStepClp: 500,
        minOrderSubtotalClp: 10000,
        shippingFlatClp: 2500,
        freeShippingThresholdClp: 25000
      }
    })
  }

  return {
    id: config.id,
    useCLP: config.useCLP,
    fxClp: Number(config.fxClp),
    alphaTierLowUsd: Number(config.alphaTierLowUsd),
    alphaTierMidUsd: Number(config.alphaTierMidUsd),
    alphaLow: Number(config.alphaLow),
    alphaMid: Number(config.alphaMid),
    alphaHigh: Number(config.alphaHigh),
    priceMinPerCardClp: config.priceMinPerCardClp,
    roundToStepClp: config.roundToStepClp,
    minOrderSubtotalClp: config.minOrderSubtotalClp,
    shippingFlatClp: config.shippingFlatClp,
    freeShippingThresholdClp: config.freeShippingThresholdClp,
    updatedAt: config.updatedAt,
    createdAt: config.createdAt
  }
}

/**
 * Gets beta CLP (daily shipping proration) for a specific date
 * Falls back to latest available if no record for the date
 */
export async function getBetaClpForDate(date?: Date): Promise<number> {
  const targetDate = date || new Date()
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Try to find record for the specific date
  let dailyShipping = await prisma.dailyShipping.findFirst({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // If no record for today, get the latest available
  if (!dailyShipping) {
    dailyShipping = await prisma.dailyShipping.findFirst({
      orderBy: { date: 'desc' }
    })
  }

  if (!dailyShipping) {
    return 0 // No shipping data available
  }

  const config = await getPricingConfig()
  const cardsCount = Math.max(dailyShipping.cardsCount, 1)
  const betaUsd = Number(dailyShipping.totalShippingUsd) / cardsCount
  return betaUsd * config.fxClp
}

/**
 * Computes price for a card using current configuration
 */
export async function getPriceForCard(tcgPriceUsd: number): Promise<number> {
  const config = await getPricingConfig()
  const betaClp = await getBetaClpForDate()

  const inputs: PricingInputs = {
    tcgPriceUsd,
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

  return computePriceCLP(tcgPriceUsd, inputs)
}

/**
 * Updates pricing configuration
 */
export async function updatePricingConfig(data: Partial<PricingConfig>): Promise<PricingConfig> {
  const config = await prisma.pricingConfig.findFirst({
    orderBy: { createdAt: 'desc' }
  })

  if (config) {
    const updated = await prisma.pricingConfig.update({
      where: { id: config.id },
      data: {
        useCLP: data.useCLP,
        fxClp: data.fxClp,
        alphaTierLowUsd: data.alphaTierLowUsd,
        alphaTierMidUsd: data.alphaTierMidUsd,
        alphaLow: data.alphaLow,
        alphaMid: data.alphaMid,
        alphaHigh: data.alphaHigh,
        priceMinPerCardClp: data.priceMinPerCardClp,
        roundToStepClp: data.roundToStepClp,
        minOrderSubtotalClp: data.minOrderSubtotalClp,
        shippingFlatClp: data.shippingFlatClp,
        freeShippingThresholdClp: data.freeShippingThresholdClp
      }
    })

    return {
      id: updated.id,
      useCLP: updated.useCLP,
      fxClp: Number(updated.fxClp),
      alphaTierLowUsd: Number(updated.alphaTierLowUsd),
      alphaTierMidUsd: Number(updated.alphaTierMidUsd),
      alphaLow: Number(updated.alphaLow),
      alphaMid: Number(updated.alphaMid),
      alphaHigh: Number(updated.alphaHigh),
      priceMinPerCardClp: updated.priceMinPerCardClp,
      roundToStepClp: updated.roundToStepClp,
      minOrderSubtotalClp: updated.minOrderSubtotalClp,
      shippingFlatClp: updated.shippingFlatClp,
      freeShippingThresholdClp: updated.freeShippingThresholdClp,
      updatedAt: updated.updatedAt,
      createdAt: updated.createdAt
    }
  } else {
    // Create new configuration
    const created = await prisma.pricingConfig.create({
      data: {
        useCLP: data.useCLP ?? true,
        fxClp: data.fxClp ?? 950,
        alphaTierLowUsd: data.alphaTierLowUsd ?? 5,
        alphaTierMidUsd: data.alphaTierMidUsd ?? 20,
        alphaLow: data.alphaLow ?? 0.9,
        alphaMid: data.alphaMid ?? 0.7,
        alphaHigh: data.alphaHigh ?? 0.5,
        priceMinPerCardClp: data.priceMinPerCardClp ?? 500,
        roundToStepClp: data.roundToStepClp ?? 500,
        minOrderSubtotalClp: data.minOrderSubtotalClp ?? 10000,
        shippingFlatClp: data.shippingFlatClp ?? 2500,
        freeShippingThresholdClp: data.freeShippingThresholdClp ?? 25000
      }
    })

    return {
      id: created.id,
      useCLP: created.useCLP,
      fxClp: Number(created.fxClp),
      alphaTierLowUsd: Number(created.alphaTierLowUsd),
      alphaTierMidUsd: Number(created.alphaTierMidUsd),
      alphaLow: Number(created.alphaLow),
      alphaMid: Number(created.alphaMid),
      alphaHigh: Number(created.alphaHigh),
      priceMinPerCardClp: created.priceMinPerCardClp,
      roundToStepClp: created.roundToStepClp,
      minOrderSubtotalClp: created.minOrderSubtotalClp,
      shippingFlatClp: created.shippingFlatClp,
      freeShippingThresholdClp: created.freeShippingThresholdClp,
      updatedAt: created.updatedAt,
      createdAt: created.createdAt
    }
  }
}

/**
 * Creates or updates daily shipping record
 */
export async function upsertDailyShipping(data: {
  date: Date
  totalShippingUsd: number
  cardsCount: number
  notes?: string
}): Promise<DailyShipping> {
  const startOfDay = new Date(data.date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(data.date)
  endOfDay.setHours(23, 59, 59, 999)

  const existing = await prisma.dailyShipping.findFirst({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  })

  if (existing) {
    const updated = await prisma.dailyShipping.update({
      where: { id: existing.id },
      data: {
        totalShippingUsd: data.totalShippingUsd,
        cardsCount: data.cardsCount,
        notes: data.notes
      }
    })

    return {
      id: updated.id,
      date: updated.date,
      totalShippingUsd: Number(updated.totalShippingUsd),
      cardsCount: updated.cardsCount,
      notes: updated.notes,
      createdAt: updated.createdAt
    }
  } else {
    const created = await prisma.dailyShipping.create({
      data: {
        date: data.date,
        totalShippingUsd: data.totalShippingUsd,
        cardsCount: data.cardsCount,
        notes: data.notes
      }
    })

    return {
      id: created.id,
      date: created.date,
      totalShippingUsd: Number(created.totalShippingUsd),
      cardsCount: created.cardsCount,
      notes: created.notes,
      createdAt: created.createdAt
    }
  }
}

/**
 * Gets recent daily shipping records
 */
export async function getRecentDailyShipping(limit: number = 7): Promise<DailyShipping[]> {
  const records = await prisma.dailyShipping.findMany({
    orderBy: { date: 'desc' },
    take: limit
  })

  return records.map(record => ({
    id: record.id,
    date: record.date,
    totalShippingUsd: Number(record.totalShippingUsd),
    cardsCount: record.cardsCount,
    notes: record.notes,
    createdAt: record.createdAt
  }))
}
