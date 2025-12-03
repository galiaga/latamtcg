import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Ayuda | LatamTCG',
    description: 'Encuentra respuestas a tus preguntas sobre compras, envíos, devoluciones y más en LatamTCG.',
    alternates: {
      canonical: 'https://latamtcg.com/help',
    },
  };
}

export default async function HelpPage() {
  const t = await getTranslations();
  
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-6">Centro de Ayuda</h1>
      
      <div className="space-y-6 text-base md:text-lg" style={{ color: 'var(--mutedText)' }}>
        <p>
          <strong style={{ color: 'var(--text)' }}>¿Necesitas ayuda?</strong> Estamos aquí para resolver todas tus 
          dudas sobre cómo comprar cartas de Magic: The Gathering en LatamTCG. Encuentra respuestas rápidas a las 
          preguntas más comunes o contáctanos directamente si necesitas asistencia personalizada.
        </p>
        
        <p>
          Nuestro proceso está diseñado para ser simple y transparente. Desde buscar cartas hasta recibirlas en tu 
          casa, cada paso está pensado para darte total confianza. Si algo no está claro o tienes una pregunta 
          específica, no dudes en <Link href="/contact" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>contactarnos</Link>.
        </p>
        
        <p>
          Para información detallada sobre cómo funciona nuestro servicio, incluyendo métodos de pago, opciones de 
          envío y políticas de devolución, visita nuestra página de 
          <Link href="/how-it-works" className="underline hover:opacity-80 ml-1" style={{ color: '#9B7BFF' }}>cómo funciona</Link>.
        </p>
      </div>
      
      <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text)' }}>Recursos útiles</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/how-it-works" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Cómo funciona LatamTCG</Link>
          </li>
          <li>
            <Link href="/returns" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Política de devoluciones</Link>
          </li>
          <li>
            <Link href="/contact" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Contacto</Link>
          </li>
          <li>
            <Link href="/mtg/search" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Buscar cartas</Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
