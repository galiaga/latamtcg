export type Locale = 'en' | 'es';

export const messages = {
  en: {
    subject: 'Order Confirmation',
    heading: '🎉 Thanks for your purchase at LatamTCG!',
    subheading: 'We received your order and will start processing it shortly.',
    details: 'Order Details',
    orderNo: 'Order #',
    date: 'Date',
    statusReceived: 'Status: Received',
    items: 'Items',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    taxes: 'Taxes',
    totalPaid: 'Total paid',
    next: 'You will receive a shipping confirmation when your order is on its way. 🚚',
    help: (email: string) => `Questions? Write to ${email}`,
    footer: (y: number) => `© ${y} LatamTCG — Made with 💜 in Latin America`,
    viewOrder: 'View my order',
  },
  es: {
    subject: 'Confirmación de pedido',
    heading: '🎉 ¡Gracias por tu compra en LatamTCG!',
    subheading: 'Recibimos tu pedido y ya estamos preparando el envío.',
    details: 'Detalles de tu pedido',
    orderNo: 'N° de pedido',
    date: 'Fecha',
    statusReceived: 'Estado: Recibido',
    items: 'Artículos comprados',
    subtotal: 'Subtotal',
    shipping: 'Envío',
    taxes: 'Impuestos',
    totalPaid: 'Total pagado',
    next: 'Recibirás un correo de confirmación cuando tu pedido esté en camino. 🚚',
    help: (email: string) => `¿Tienes dudas? Escríbenos a ${email}`,
    footer: (y: number) => `© ${y} LatamTCG — Hecho con 💜 en Latinoamérica`,
    viewOrder: 'Ver mi pedido',
  },
} as const;

export function t<
  K extends keyof typeof messages['en']
>(key: K, locale: Locale) {
  return (messages as any)[locale][key];
}

