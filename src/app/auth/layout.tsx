import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | LatamTCG',
  description: 'Inicia sesión en tu cuenta de LatamTCG para gestionar tus pedidos',
  robots: { 
    index: false, // Authentication pages should NOT be indexed
    follow: true 
  },
  alternates: {
    canonical: 'https://latamtcg.com/auth',
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
