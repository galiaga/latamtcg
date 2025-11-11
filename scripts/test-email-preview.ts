/**
 * Test script to preview order confirmation emails in both locales
 * Run with: npx tsx scripts/test-email-preview.ts
 */

import { renderOrderHtml } from '../src/emails/order-confirmation.html'
import { renderOrderText } from '../src/emails/order-confirmation.text'
import { writeFileSync } from 'fs'
import { join } from 'path'

const testData = {
  orderId: 'test-order-123456789',
  orderDateISO: new Date().toISOString(),
  items: [
    { name: 'Lightning Bolt', quantity: 2, priceCLP: 5000 },
    { name: 'Black Lotus', quantity: 1, priceCLP: 500000 },
  ],
  subtotalCLP: 510000,
  shippingCLP: 5000,
  taxesCLP: 97000,
  totalCLP: 612000,
  supportEmail: 'hola@latamtcg.com',
  orderUrl: 'https://latamtcg.com/order/confirmation?orderId=test-order-123456789',
}

console.log('Generating email previews...\n')

// Generate English email
const enHtml = renderOrderHtml({ ...testData, locale: 'en' })
const enText = renderOrderText({ ...testData, locale: 'en' })

// Generate Spanish email
const esHtml = renderOrderHtml({ ...testData, locale: 'es' })
const esText = renderOrderText({ ...testData, locale: 'es' })

// Write files
const outputDir = join(process.cwd(), 'email-previews')
try {
  writeFileSync(join(outputDir, 'order-confirmation-en.html'), enHtml)
  writeFileSync(join(outputDir, 'order-confirmation-en.txt'), enText)
  writeFileSync(join(outputDir, 'order-confirmation-es.html'), esHtml)
  writeFileSync(join(outputDir, 'order-confirmation-es.txt'), esText)
  
  console.log('✅ Email previews generated in email-previews/ directory:')
  console.log('  - order-confirmation-en.html')
  console.log('  - order-confirmation-en.txt')
  console.log('  - order-confirmation-es.html')
  console.log('  - order-confirmation-es.txt')
  console.log('\nOpen the HTML files in your browser to preview.')
} catch (error) {
  // Create directory if it doesn't exist
  const { mkdirSync } = require('fs')
  mkdirSync(outputDir, { recursive: true })
  
  writeFileSync(join(outputDir, 'order-confirmation-en.html'), enHtml)
  writeFileSync(join(outputDir, 'order-confirmation-en.txt'), enText)
  writeFileSync(join(outputDir, 'order-confirmation-es.html'), esHtml)
  writeFileSync(join(outputDir, 'order-confirmation-es.txt'), esText)
  
  console.log('✅ Email previews generated in email-previews/ directory:')
  console.log('  - order-confirmation-en.html')
  console.log('  - order-confirmation-en.txt')
  console.log('  - order-confirmation-es.html')
  console.log('  - order-confirmation-es.txt')
  console.log('\nOpen the HTML files in your browser to preview.')
}

