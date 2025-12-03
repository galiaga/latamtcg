import PopularCards from '@/components/PopularCards'
import RandomButton from '@/components/RandomButton'
import { getLocale } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  
  // Spanish metadata (default)
  if (locale === 'es') {
    return {
      title: 'Comprar Cartas de Magic en Chile | Todas las cartas, siempre',
      description: 'Encuentra cartas de Magic The Gathering y compra con total confianza. Plataforma profesional, segura y sin vendedores informales. Recibe siempre lo que pediste.',
      alternates: {
        canonical: 'https://latamtcg.com',
      },
      openGraph: {
        title: 'Comprar Cartas de Magic en Chile | Todas las cartas, siempre',
        description: 'Encuentra cartas de Magic The Gathering y compra con total confianza. Plataforma profesional, segura y sin vendedores informales. Recibe siempre lo que pediste.',
        url: 'https://latamtcg.com',
      },
      twitter: {
        title: 'Comprar Cartas de Magic en Chile | Todas las cartas, siempre',
        description: 'Encuentra cartas de Magic The Gathering y compra con total confianza. Plataforma profesional, segura y sin vendedores informales.',
      },
    }
  }
  
  // English metadata fallback (shouldn't be used on / route, but included for safety)
  return {
    title: 'Buy Magic: The Gathering Cards in Chile | Every Card, Always | LatamTCG',
    description: 'Find all the Magic: The Gathering cards you need in English and buy with complete confidence. A professional, secure platform with no informal sellers. Always receive exactly what you ordered.',
    alternates: {
      canonical: 'https://latamtcg.com',
    },
    openGraph: {
      title: 'Buy Magic: The Gathering Cards in Chile | Every Card, Always | LatamTCG',
      description: 'Find all the Magic: The Gathering cards you need in English and buy with complete confidence.',
      url: 'https://latamtcg.com',
    },
    twitter: {
      title: 'Buy Magic: The Gathering Cards in Chile | Every Card, Always | LatamTCG',
      description: 'Find all the Magic: The Gathering cards you need in English and buy with complete confidence.',
    },
  }
}

export default async function Home() {
  const locale = await getLocale()
  
  // Spanish homepage content (default)
  if (locale === 'es') {
    return (
      <div className="py-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <section className="text-center px-4 pt-2 pb-4" aria-labelledby="hero-heading">
            <h1 id="hero-heading" className="text-4xl md:text-5xl font-bold text-center mb-3" style={{ letterSpacing: '-0.02em' }}>
              Todas las cartas, siempre. Con total confianza.
            </h1>
            <p className="max-w-2xl mx-auto text-center text-lg text-gray-700 mt-4">
              Compra cartas de Magic: The Gathering con un proceso seguro, profesional y sin riesgos. Conseguir lo que necesitas nunca había sido tan confiable.
            </p>
            
            {/* Bullet List */}
            <ul className="text-left max-w-2xl mx-auto mt-4 space-y-3 text-base text-gray-700">
              <li className="flex items-start">
                <span className="mr-3 text-primary">•</span>
                <span>Encuentra el 99% del catálogo mundial</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-primary">•</span>
                <span>Solo cartas en inglés, con mayor valor de reventa</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-primary">•</span>
                <span>Proceso profesional, no informal</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-primary">•</span>
                <span>Recibe siempre lo que pediste, sin sorpresas</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-primary">•</span>
                <span>Compra todo en un solo lugar, sin perseguir vendedores</span>
              </li>
            </ul>
            
            <div className="mt-4">
              <RandomButton />
            </div>
          </section>

          {/* Popular Cards Section */}
          <PopularCards />
        </div>
      </div>
    )
  }
  
  // English homepage fallback (shouldn't be used on / route)
  return (
    <div className="py-4">
      <div className="max-w-7xl mx-auto">
        <section className="text-center px-4 pt-2 pb-4" aria-labelledby="hero-heading">
          <h1 id="hero-heading" className="text-4xl md:text-5xl font-bold text-center mb-3" style={{ letterSpacing: '-0.02em' }}>
            Every card, always. With complete confidence.
          </h1>
          <p className="max-w-2xl mx-auto text-center text-lg text-gray-700 mt-4">
            Buy Magic: The Gathering cards with a safe, professional, and fully reliable process. Getting exactly what you need has never been this trustworthy.
          </p>
          
          <ul className="text-left max-w-2xl mx-auto mt-4 space-y-3 text-base text-gray-700">
            <li className="flex items-start">
              <span className="mr-3 text-primary">•</span>
              <span>Access 99% of the global card catalog</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-primary">•</span>
              <span>English-only cards for stronger long-term value</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-primary">•</span>
              <span>A professional process, never informal</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-primary">•</span>
              <span>You always receive exactly what you ordered</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-primary">•</span>
              <span>Find everything in one place without chasing multiple sellers</span>
            </li>
          </ul>
          
          <div className="mt-4">
            <RandomButton />
          </div>
        </section>

        <PopularCards />
      </div>
    </div>
  )
}
