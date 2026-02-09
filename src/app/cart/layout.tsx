import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carrito de Compras | LatamTCG',
  description: 'Revisa tu carrito de compras de cartas Magic: The Gathering',
  robots: { 
    index: false, // Cart pages should NOT be indexed - they're user-specific
    follow: true 
  },
  alternates: {
    canonical: 'https://latamtcg.com/cart',
  },
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
