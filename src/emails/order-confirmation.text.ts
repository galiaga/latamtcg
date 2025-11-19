import { messages, t, type Locale } from './i18n/messages';
import { resolveLocale, formatCLP, formatDate } from './i18n/format';

export type OrderEmailData = {
  orderId: string;
  orderDateISO: string;
  items: { name: string; quantity: number; priceCLP: number; finishLabel?: string }[];
  subtotalCLP: number;
  shippingCLP?: number;
  taxesCLP?: number;
  totalCLP: number;
  supportEmail: string;
  orderUrl?: string;
  locale?: Locale;
  deliveryMethod?: 'pickup' | 'courier';
};

export function renderOrderText(d: OrderEmailData) {
  const locale = resolveLocale(d.locale);
  const lines: string[] = [];

  lines.push(t('heading', locale));
  lines.push('');

  lines.push(`${t('orderNo', locale)} ${d.orderId}`);
  lines.push(`${t('date', locale)}: ${formatDate(d.orderDateISO, locale)}`);
  lines.push(`${t('statusReceived', locale)}`);
  lines.push('');

  lines.push(`${t('items', locale)}:`);
  d.items.forEach(i => {
    const finishText = i.finishLabel ? ` (${i.finishLabel})` : '';
    lines.push(`- ${i.name}${finishText} x${i.quantity} — ${formatCLP(i.priceCLP, locale)}`);
  });
  lines.push('');

  lines.push(`${t('subtotal', locale)}: ${formatCLP(d.subtotalCLP, locale)}`);
  if (d.shippingCLP != null) {
    const shippingLabel = d.deliveryMethod === 'courier' ? t('shippingChilexpress', locale) : t('shipping', locale);
    lines.push(`${shippingLabel}: ${formatCLP(d.shippingCLP, locale)}`);
  }
  if (d.taxesCLP != null) lines.push(`${t('taxes', locale)}: ${formatCLP(d.taxesCLP, locale)}`);
  lines.push(`${t('totalPaid', locale)}: ${formatCLP(d.totalCLP, locale)}`);
  if (d.orderUrl) lines.push(`${t('viewOrder', locale)}: ${d.orderUrl}`);
  lines.push('');

  // Delivery method-specific next steps
  if (d.deliveryMethod === 'pickup') {
    lines.push(t('nextPickup', locale));
  } else if (d.deliveryMethod === 'courier') {
    lines.push(t('nextCourier', locale));
  } else {
    lines.push(t('next', locale));
  }
  lines.push(messages[locale].help(d.supportEmail));
  lines.push(messages[locale].footer(new Date().getFullYear()));

  return lines.join('\n');
}

