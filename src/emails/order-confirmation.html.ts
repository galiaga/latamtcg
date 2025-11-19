import { messages, t, type Locale } from './i18n/messages';
import { resolveLocale, formatCLP, formatDate } from './i18n/format';
import type { OrderEmailData } from './order-confirmation.text';

const css = {
  body: 'margin:0;padding:0;background:#ffffff;color:#222;font-family:Arial,Segoe UI,Roboto,Helvetica,sans-serif;',
  container: 'max-width:640px;margin:0 auto;padding:24px;',
  h1: 'margin:0 0 8px 0;font-size:22px;color:#5B3FD3;',
  p: 'margin:0 0 12px 0;line-height:1.5;',
  card: 'background:#F6F6F6;border-radius:8px;padding:12px 16px;margin:12px 0;',
  small: 'color:#6B7280;font-size:12px;',
  total: 'font-size:18px;margin-top:8px;',
  btn: 'display:inline-block;background:#5B3FD3;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;margin-top:8px;',
  li: 'margin:0 0 6px 0;',
};

export function renderOrderHtml(d: OrderEmailData) {
  const locale = resolveLocale(d.locale);
  const year = new Date().getFullYear();

  const itemsHtml = d.items.map(i => {
    const finishText = i.finishLabel ? ` <span style="color:#6B7280;font-size:0.9em;">(${i.finishLabel})</span>` : '';
    return `<li style="${css.li}"><strong>${i.name}</strong>${finishText} ×${i.quantity} — <strong>${formatCLP(i.priceCLP, locale)}</strong></li>`;
  }).join('');

  const shippingLabel = d.deliveryMethod === 'courier' && d.shippingCLP != null 
    ? t('shippingChilexpress', locale) 
    : t('shipping', locale);
  
  const totals = `
    <p style="${css.p}"><strong>${t('subtotal', locale)}:</strong> ${formatCLP(d.subtotalCLP, locale)}</p>
    ${d.shippingCLP != null ? `<p style="${css.p}"><strong>${shippingLabel}:</strong> ${formatCLP(d.shippingCLP, locale)}</p>` : ''}
    ${d.taxesCLP != null ? `<p style="${css.p}"><strong>${t('taxes', locale)}:</strong> ${formatCLP(d.taxesCLP, locale)}</p>` : ''}
    <p style="${css.total}"><strong>${t('totalPaid', locale)}:</strong> ${formatCLP(d.totalCLP, locale)}</p>
  `;

  const deliveryMethodInfo = d.deliveryMethod 
    ? `<p style="${css.p}"><strong>${t('deliveryMethod', locale)}:</strong> ${d.deliveryMethod === 'pickup' ? t('deliveryMethodPickup', locale) : t('deliveryMethodCourier', locale)}</p>`
    : '';

  const cta = d.orderUrl ? `<p><a href="${d.orderUrl}" style="${css.btn}">${t('viewOrder', locale)} →</a></p>` : '';

  // Delivery method-specific next steps
  let nextSteps = '';
  if (d.deliveryMethod === 'pickup') {
    nextSteps = `<p style="${css.p}">${t('nextPickup', locale)}</p>`;
  } else if (d.deliveryMethod === 'courier') {
    nextSteps = `<p style="${css.p}">${t('nextCourier', locale)}</p>`;
  } else {
    nextSteps = `<p style="${css.p}">${t('next', locale)}</p>`;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${css.body}">
  <div style="${css.container}">
    <h1 style="${css.h1}">${t('heading', locale)}</h1>
    <p style="${css.p}">${t('subheading', locale)}</p>
    <div style="${css.card}">
      <p style="${css.p}"><strong>${t('orderNo', locale)}:</strong> ${d.orderId}</p>
      <p style="${css.p}"><strong>${t('date', locale)}:</strong> ${formatDate(d.orderDateISO, locale)}</p>
      <p style="${css.p}">${t('statusReceived', locale)}</p>
      ${deliveryMethodInfo}
    </div>
    <h2 style="font-size:16px;margin:16px 0 8px 0;">${t('items', locale)}</h2>
    <ul style="padding-left:18px;margin:0 0 12px 0;">${itemsHtml}</ul>
    ${totals}
    ${cta}
    ${nextSteps}
    <p style="${css.small}">${messages[locale].help(d.supportEmail)}</p>
    <p style="${css.small}">${messages[locale].footer(year)}</p>
  </div>
</body></html>`;
}

