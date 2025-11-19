export type Locale = 'en' | 'es';

export const messages = {
  en: {
    subject: 'Order Confirmation',
    subjectPickup: 'Your LatamTCG order is confirmed – pickup in Providencia',
    subjectCourier: 'Your LatamTCG order is confirmed – Chilexpress shipping',
    heading: '🎉 Thanks for your purchase at LatamTCG!',
    subheading: 'We received your order and will start processing it shortly.',
    details: 'Order Details',
    orderNo: 'Order #',
    date: 'Date',
    statusReceived: 'Status: Received',
    items: 'Items',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    shippingChilexpress: 'Shipping (Chilexpress)',
    taxes: 'Taxes',
    totalPaid: 'Total paid',
    next: 'You will receive a shipping confirmation when your order is on its way. 🚚',
    nextPickup: 'We will contact you via WhatsApp and email to coordinate the meeting point near a Metro station in Providencia and arrange a convenient pickup time. Please bring a valid ID or your order number when picking up.',
    nextCourier: 'We will dispatch your order within 1–2 business days. You will receive another email once your package is shipped with the tracking code. Estimated delivery times vary by region (typically 1–3 business days within the Metropolitan Region, 3–7 business days to other regions).',
    deliveryMethod: 'Delivery Method',
    deliveryMethodPickup: 'Local Pickup (Providencia, Santiago)',
    deliveryMethodCourier: 'Chilexpress Shipping',
    help: (email: string) => `Questions? Write to ${email}`,
    footer: (y: number) => `© ${y} LatamTCG — Made with 💜 in Latin America`,
    viewOrder: 'View my order',
  },
  es: {
    subject: 'Confirmación de pedido',
    subjectPickup: 'Tu pedido en LatamTCG está confirmado – retiro en Providencia',
    subjectCourier: 'Tu pedido en LatamTCG está confirmado – envío por Chilexpress',
    heading: '🎉 ¡Gracias por tu compra en LatamTCG!',
    subheading: 'Recibimos tu pedido y ya estamos preparando el envío.',
    details: 'Detalles de tu pedido',
    orderNo: 'N° de pedido',
    date: 'Fecha',
    statusReceived: 'Estado: Recibido',
    items: 'Artículos comprados',
    subtotal: 'Subtotal',
    shipping: 'Envío',
    shippingChilexpress: 'Envío (Chilexpress)',
    taxes: 'Impuestos',
    totalPaid: 'Total pagado',
    next: 'Recibirás un correo de confirmación cuando tu pedido esté en camino. 🚚',
    nextPickup: 'Te contactaremos por WhatsApp y correo electrónico para coordinar el punto de encuentro cerca de una estación de Metro en Providencia y acordar un horario conveniente para el retiro. Por favor trae tu cédula o el número de pedido al retirar.',
    nextCourier: 'Despacharemos tu pedido dentro de 1–2 días hábiles. Recibirás otro correo cuando tu pedido sea despachado con el código de seguimiento. Los tiempos de entrega estimados varían según la región (típicamente 1–3 días hábiles dentro de la Región Metropolitana, 3–7 días hábiles a otras regiones).',
    deliveryMethod: 'Método de entrega',
    deliveryMethodPickup: 'Retiro Presencial (Providencia, Santiago)',
    deliveryMethodCourier: 'Envío por Chilexpress',
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

