/**
 * Email service for sending order confirmations and notifications
 * Uses Resend for email delivery
 */

import { Resend } from 'resend'

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
  shippingCLP: number
  totalCLP: number
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
  const { to, orderId, orderDate, items, subtotalCLP, shippingCLP, totalCLP } = params

  // Format email content
  const emailContent = {
    to,
    subject: `Order Confirmation - ${orderId.slice(0, 12)}`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Order Confirmation</h1>
          <p>Thank you for your order!</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Order Date:</strong> ${orderDate.toLocaleString('es-CL')}</p>
          </div>

          <h2>Order Items</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Quantity</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.cardName}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${item.lineTotalCLP.toLocaleString('es-CL')} CLP</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">
            <p style="text-align: right;"><strong>Subtotal:</strong> ${subtotalCLP.toLocaleString('es-CL')} CLP</p>
            ${shippingCLP > 0 ? `<p style="text-align: right;"><strong>Shipping:</strong> ${shippingCLP.toLocaleString('es-CL')} CLP</p>` : ''}
            <p style="text-align: right; font-size: 18px; font-weight: bold;"><strong>Total:</strong> ${totalCLP.toLocaleString('es-CL')} CLP</p>
          </div>

          <p style="margin-top: 30px; color: #666;">
            Your order will be processed and shipped as soon as possible.
          </p>

          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            If you have any questions, please contact our support team.
          </p>
        </body>
      </html>
    `,
    text: `
Order Confirmation

Order ID: ${orderId}
Order Date: ${orderDate.toLocaleString('es-CL')}

Order Items:
${items.map((item) => `- ${item.cardName} × ${item.quantity}: ${item.lineTotalCLP.toLocaleString('es-CL')} CLP`).join('\n')}

Subtotal: ${subtotalCLP.toLocaleString('es-CL')} CLP
${shippingCLP > 0 ? `Shipping: ${shippingCLP.toLocaleString('es-CL')} CLP\n` : ''}Total: ${totalCLP.toLocaleString('es-CL')} CLP

Your order will be processed and shipped as soon as possible.
    `,
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

