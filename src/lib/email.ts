/**
 * Email service for sending order confirmations and notifications
 * Uses Resend for email delivery
 */

import { Resend } from 'resend'
import { renderOrderHtml } from '@/emails/order-confirmation.html'
import { renderOrderText } from '@/emails/order-confirmation.text'
import { messages, type Locale } from '@/emails/i18n/messages'
import { resolveLocale } from '@/emails/i18n/format'

interface OrderConfirmationEmailParams {
  to: string
  orderId: string
  orderDate: Date
  items: Array<{
    cardName: string
    quantity: number
    lineTotalCLP: number
  }>
  subtotalCLP: number
  shippingCLP?: number
  taxesCLP?: number
  totalCLP: number
  locale?: Locale
  supportEmail?: string
  orderUrl?: string
  deliveryMethod?: 'pickup' | 'courier'
}

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

/**
 * Sends order confirmation email via Resend
 */
export async function sendOrderConfirmationEmail(
  params: OrderConfirmationEmailParams
): Promise<void> {
  const {
    to,
    orderId,
    orderDate,
    items,
    subtotalCLP,
    shippingCLP,
    taxesCLP,
    totalCLP,
    locale,
    supportEmail = 'hola@latamtcg.com',
    orderUrl,
    deliveryMethod = 'courier', // Default to courier for backward compatibility
  } = params

  const resolvedLocale = resolveLocale(locale)

  // Prepare email data
  const emailData = {
    orderId,
    orderDateISO: orderDate.toISOString(),
    items: items.map((item: any) => ({
      name: item.displayName || item.cardName || 'Unknown Card',
      quantity: item.quantity,
      priceCLP: item.lineTotalCLP,
      finishLabel: item.finishLabel,
    })),
    subtotalCLP,
    shippingCLP,
    taxesCLP,
    totalCLP,
    supportEmail,
    orderUrl,
    locale: resolvedLocale,
    deliveryMethod,
  }

  // Render email content using i18n templates
  const html = renderOrderHtml(emailData)
  const text = renderOrderText(emailData)
  
  // Use delivery method-specific subject
  const subject = deliveryMethod === 'pickup' 
    ? messages[resolvedLocale].subjectPickup 
    : deliveryMethod === 'courier'
    ? messages[resolvedLocale].subjectCourier
    : messages[resolvedLocale].subject

  const emailContent = {
    to,
    subject,
    html,
    text,
  }

  // Send email via Resend if configured
  if (resend && process.env.RESEND_FROM_EMAIL) {
    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [to],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })

      if (result.error) {
        console.error('[email] Resend error:', result.error)
        // Fallback to console log
        console.log('[email] Order confirmation email (failed to send):', {
          to,
          subject: emailContent.subject,
          orderId,
          error: result.error,
        })
      } else {
        console.log('[email] Order confirmation email sent via Resend:', {
          to,
          subject: emailContent.subject,
          orderId,
          emailId: result.data?.id,
        })
      }
    } catch (error) {
      console.error('[email] Failed to send email via Resend:', error)
      // Fallback to console log
      console.log('[email] Order confirmation email (failed to send):', {
        to,
        subject: emailContent.subject,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  } else {
    // Log to console if Resend is not configured
    console.log('[email] Order confirmation email (Resend not configured):', {
      to,
      subject: emailContent.subject,
      orderId,
      note: 'Set RESEND_API_KEY and RESEND_FROM_EMAIL to send real emails',
    })
  }
}

