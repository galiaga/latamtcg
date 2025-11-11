/**
 * Test script to preview order confirmation emails with real cart items from the database
 * 
 * Usage:
 *   npx tsx scripts/test-email-real-data.ts                    # Use a real paid order if available
 *   npx tsx scripts/test-email-real-data.ts --order-id <id>   # Use a specific order ID
 *   npx tsx scripts/test-email-real-data.ts --real-cards      # Generate with real card names from DB
 */

import { prisma } from '../src/lib/prisma'
import { renderOrderHtml } from '../src/emails/order-confirmation.html'
import { renderOrderText } from '../src/emails/order-confirmation.text'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function getRealOrder(orderId?: string) {
  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        amountCLP: true,
        metadata: true,
      },
    })
    return order
  }

  // Try to find a recent paid order
  const order = await prisma.order.findFirst({
    where: {
      status: 'paid',
      email: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      createdAt: true,
      amountCLP: true,
      metadata: true,
    },
  })
  return order
}

async function getRealCardNames(limit: number = 5) {
  const cards = await prisma.mtgCard.findMany({
    where: {
      isPaper: true,
      lang: 'en',
      OR: [
        { priceUsd: { not: null } },
        { priceUsdFoil: { not: null } },
        { priceUsdEtched: { not: null } },
      ],
    },
    select: {
      name: true,
      priceUsd: true,
      priceUsdFoil: true,
      priceUsdEtched: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit * 2, // Get more to filter out nulls
  })

  return cards
    .filter((card) => card.name != null) // Filter out null names
    .slice(0, limit)
    .map((card) => {
    const priceUsd = card.priceUsd ? Number(card.priceUsd) : 0
    const priceUsdFoil = card.priceUsdFoil ? Number(card.priceUsdFoil) : 0
    const priceUsdEtched = card.priceUsdEtched ? Number(card.priceUsdEtched) : 0
    // Use the highest available price
    const price = Math.max(priceUsd, priceUsdFoil, priceUsdEtched)
    // Convert to CLP (rough estimate: 1 USD = 1000 CLP)
    const priceCLP = Math.round(price * 1000)
    return {
      name: card.name || 'Unknown Card',
      priceCLP: priceCLP || 1000,
    }
  })
}

async function main() {
  const args = process.argv.slice(2)
  const orderIdArg = args.findIndex((arg) => arg === '--order-id')
  const orderId = orderIdArg >= 0 ? args[orderIdArg + 1] : undefined
  const useRealCards = args.includes('--real-cards')

  let emailData: any

  if (useRealCards) {
    // Generate test data with real card names
    console.log('Fetching real card names from database...')
    const realCards = await getRealCardNames(5)
    
    const finishes = ['Normal', 'Foil', 'Etched', 'Normal', 'Foil'] // Cycle through finishes
    const items = realCards.map((card, idx) => ({
      name: card.name,
      quantity: idx + 1,
      priceCLP: card.priceCLP * (idx + 1), // line total
      finishLabel: finishes[idx % finishes.length],
    }))

    const subtotalCLP = items.reduce((sum, item) => sum + item.priceCLP, 0)
    const shippingCLP = 5000
    const taxesCLP = Math.round(subtotalCLP * 0.19) // 19% tax
    const totalCLP = subtotalCLP + shippingCLP + taxesCLP

    emailData = {
      orderId: 'test-order-real-cards',
      orderDateISO: new Date().toISOString(),
      items,
      subtotalCLP,
      shippingCLP,
      taxesCLP,
      totalCLP,
      supportEmail: 'hola@latamtcg.com',
      orderUrl: 'https://latamtcg.com/order/confirmation?orderId=test-order-real-cards',
    }
    console.log(`✅ Using real card names: ${realCards.map((c) => c.name).join(', ')}`)
  } else {
    // Try to use a real order
    console.log(orderId ? `Looking for order: ${orderId}...` : 'Looking for a recent paid order...')
    const order = await getRealOrder(orderId)

    if (!order) {
      console.log('❌ No paid order found. Use --real-cards to generate with real card names, or --order-id <id> to use a specific order.')
      process.exit(1)
    }

    const metadata = order.metadata as any
    const items = metadata?.items || []
    
    if (items.length === 0) {
      console.log('❌ Order has no items in metadata. Use --real-cards to generate with real card names.')
      process.exit(1)
    }

    emailData = {
      orderId: order.id,
      orderDateISO: order.createdAt.toISOString(),
      items: items.map((item: any) => ({
        name: item.displayName || item.cardName || 'Unknown Card',
        quantity: item.quantity || 1,
        priceCLP: item.lineTotalCLP || 0,
        finishLabel: item.finishLabel,
      })),
      subtotalCLP: metadata?.subtotalCLP || order.amountCLP || 0,
      shippingCLP: metadata?.shippingCLP || 0,
      taxesCLP: metadata?.taxesCLP,
      totalCLP: metadata?.totalCLP || order.amountCLP || 0,
      supportEmail: 'hola@latamtcg.com',
      orderUrl: `https://latamtcg.com/order/confirmation?orderId=${order.id}`,
    }
    console.log(`✅ Using real order: ${order.id} with ${items.length} items`)
  }

  console.log('\nGenerating email previews...\n')

  // Generate English email
  const enHtml = renderOrderHtml({ ...emailData, locale: 'en' })
  const enText = renderOrderText({ ...emailData, locale: 'en' })

  // Generate Spanish email
  const esHtml = renderOrderHtml({ ...emailData, locale: 'es' })
  const esText = renderOrderText({ ...emailData, locale: 'es' })

  // Write files
  const outputDir = join(process.cwd(), 'email-previews')
  try {
    writeFileSync(join(outputDir, 'order-confirmation-en.html'), enHtml)
    writeFileSync(join(outputDir, 'order-confirmation-en.txt'), enText)
    writeFileSync(join(outputDir, 'order-confirmation-es.html'), esHtml)
    writeFileSync(join(outputDir, 'order-confirmation-es.txt'), esText)
  } catch (error: any) {
    // Create directory if it doesn't exist
    const { mkdirSync } = require('fs')
    mkdirSync(outputDir, { recursive: true })
    
    writeFileSync(join(outputDir, 'order-confirmation-en.html'), enHtml)
    writeFileSync(join(outputDir, 'order-confirmation-en.txt'), enText)
    writeFileSync(join(outputDir, 'order-confirmation-es.html'), esHtml)
    writeFileSync(join(outputDir, 'order-confirmation-es.txt'), esText)
  }

  console.log('✅ Email previews generated in email-previews/ directory:')
  console.log('  - order-confirmation-en.html')
  console.log('  - order-confirmation-en.txt')
  console.log('  - order-confirmation-es.html')
  console.log('  - order-confirmation-es.txt')
  console.log('\nOpen the HTML files in your browser to preview.')
  console.log('\nItems in email:')
  emailData.items.forEach((item: any) => {
    const finishText = item.finishLabel ? ` (${item.finishLabel})` : ''
    console.log(`  - ${item.name}${finishText} x${item.quantity} — CLP ${item.priceCLP.toLocaleString()}`)
  })

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

