import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: 'Acerca de LatamTCG | Compra segura',
    description: 'Conoce LatamTCG: tu plataforma confiable para comprar cartas de Magic en Chile. Todas las cartas, siempre. Con total confianza.',
    alternates: {
      canonical: 'https://latamtcg.com/about',
    },
  };
}

export default async function AboutPage() {
  const t = await getTranslations();
  
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-6">Acerca de LatamTCG</h1>
      
      <div className="space-y-6 text-base md:text-lg" style={{ color: 'var(--mutedText)' }}>
        <p>
          <strong style={{ color: 'var(--text)' }}>Todas las cartas, siempre. Con total confianza.</strong> En LatamTCG, 
          creemos que comprar cartas de Magic: The Gathering debe ser simple, seguro y confiable. Somos una plataforma 
          profesional que conecta a jugadores y coleccionistas en Chile con el mercado global de cartas, garantizando 
          autenticidad, calidad y transparencia en cada transacción.
        </p>
        
        <p>
          Nuestra misión es eliminar las preocupaciones comunes al comprar cartas: vendedores informales, productos 
          falsificados, condiciones no descritas y sorpresas al recibir. En LatamTCG, cada carta está verificada, 
          cada precio es transparente y cada entrega está protegida. Recibes siempre exactamente lo que pediste.
        </p>
        
        <p>
          Operamos desde Providencia, Santiago, y estamos comprometidos con construir una comunidad de confianza 
          para los amantes de Magic: The Gathering en Chile. Si tienes preguntas o necesitas ayuda, 
          <Link href="/contact" className="underline hover:opacity-80 ml-1" style={{ color: '#9B7BFF' }}>contáctanos</Link> o 
          <Link href="/how-it-works" className="underline hover:opacity-80 ml-1" style={{ color: '#9B7BFF' }}>aprende cómo funciona</Link> nuestro proceso.
        </p>
      </div>
      
      <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text)' }}>Enlaces útiles</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Inicio</Link>
          </li>
          <li>
            <Link href="/how-it-works" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Cómo funciona</Link>
          </li>
          <li>
            <Link href="/mtg/search" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Buscar cartas</Link>
          </li>
          <li>
            <Link href="/contact" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Contacto</Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
