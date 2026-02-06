import PopularCards from '@/components/PopularCards'
import MostExpensiveRecentCardsCarousel from '@/components/MostExpensiveRecentCardsCarousel'
import { getLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { 
  ShieldCheckIcon, 
  CubeIcon, 
  GlobeAltIcon, 
  TagIcon, 
  BriefcaseIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

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
          {/* Most Expensive Recent Cards Carousel - FIRST SECTION */}
          <MostExpensiveRecentCardsCarousel />

          {/* Hero Section - Search Focused */}
          <section className="text-center px-4 py-2 md:py-10" aria-labelledby="hero-heading">
            <h1 id="hero-heading" className="text-2xl md:text-4xl lg:text-5xl font-semibold md:font-bold text-center mb-2 md:mb-3" style={{ letterSpacing: '-0.02em' }}>
              Compra singles de Magic: The Gathering en Chile
            </h1>
            <p className="max-w-2xl mx-auto text-center text-sm md:text-base lg:text-lg text-gray-700 hidden sm:block">
              Cartas individuales en inglés, con un proceso seguro y profesional.
            </p>
          </section>

          {/* Popular Cards Section */}
          <section className="mt-2 md:mt-8">
            <PopularCards />
          </section>

          {/* Trust & Branding Section */}
          <section className="py-8 md:py-14" aria-labelledby="trust-heading">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-6 md:mb-10">
                <h2 id="trust-heading" className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-5" style={{ letterSpacing: '-0.01em' }}>
                  Todas las cartas, siempre. Con total confianza.
                </h2>
                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4" style={{ letterSpacing: '-0.01em' }}>
                  ¿Por qué confiar en LatamTCG?
                </h3>
                <p className="max-w-2xl mx-auto text-sm md:text-base lg:text-lg text-gray-700">
                  LatamTCG es el lugar más confiable para comprar cartas de Magic: The Gathering en Chile. Recibes exactamente lo que pediste, sin riesgos y con un proceso profesional pensado para que compres tranquilo.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card 1: Compra 100% segura */}
                <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <ShieldCheckIcon className="w-8 h-8 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Compra 100% segura</h3>
                  <p className="text-gray-600 text-sm">Cada pedido es verificado antes de enviarse.</p>
                </div>

                {/* Card 2: Recibes exactamente lo que pediste */}
                <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <CubeIcon className="w-8 h-8 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Recibes exactamente lo que pediste</h3>
                  <p className="text-gray-600 text-sm">Sin sorpresas ni vendedores informales.</p>
                </div>

                {/* Card 3: 99% del catálogo mundial */}
                <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <GlobeAltIcon className="w-8 h-8 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">99% del catálogo mundial</h3>
                  <p className="text-gray-600 text-sm">Incluso cartas difíciles de encontrar.</p>
                </div>

                {/* Card 4: Cartas solo en inglés */}
                <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <TagIcon className="w-8 h-8 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Cartas solo en inglés</h3>
                  <p className="text-gray-600 text-sm">Mayor valor de reventa y consistencia.</p>
                </div>

                {/* Card 5: Proceso profesional */}
                <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <BriefcaseIcon className="w-8 h-8 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Proceso profesional</h3>
                  <p className="text-gray-600 text-sm">Nada de páginas informales o listas improvisadas.</p>
                </div>

                {/* Card 6: Acompañamiento en cada compra */}
                <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <ChatBubbleLeftRightIcon className="w-8 h-8 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Acompañamiento en cada compra</h3>
                  <p className="text-gray-600 text-sm">Si algo sale mal, te ayudamos hasta que quede resuelto.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }
  
  // English homepage fallback (shouldn't be used on / route)
  return (
    <div className="py-4">
      <div className="max-w-7xl mx-auto">
        {/* Most Expensive Recent Cards Carousel - FIRST SECTION */}
        <MostExpensiveRecentCardsCarousel />

        {/* Hero Section - Search Focused */}
        <section className="text-center px-4 py-2 md:py-10" aria-labelledby="hero-heading">
          <h1 id="hero-heading" className="text-2xl md:text-4xl lg:text-5xl font-semibold md:font-bold text-center mb-2 md:mb-3" style={{ letterSpacing: '-0.02em' }}>
            Buy Magic: The Gathering Singles in Chile
          </h1>
          <p className="max-w-2xl mx-auto text-center text-sm md:text-base lg:text-lg text-gray-700 hidden sm:block">
            English-only singles with a safe and professional process.
          </p>
        </section>

        {/* Popular Cards Section */}
        <section className="mt-2 md:mt-8">
          <PopularCards />
        </section>

        {/* Trust & Branding Section */}
        <section className="py-8 md:py-14" aria-labelledby="trust-heading">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-6 md:mb-10">
              <h2 id="trust-heading" className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-5" style={{ letterSpacing: '-0.01em' }}>
                Every card, always. With complete confidence.
              </h2>
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4" style={{ letterSpacing: '-0.01em' }}>
                Why Trust LatamTCG?
              </h3>
              <p className="max-w-2xl mx-auto text-sm md:text-base lg:text-lg text-gray-700">
                LatamTCG is the most reliable place to buy Magic: The Gathering cards in Chile. You receive exactly what you ordered, with no risks and a fully professional process made for peace of mind.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: 100% secure purchases */}
              <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                <ShieldCheckIcon className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2">100% secure purchases</h3>
                <p className="text-gray-600 text-sm">Every order is verified before shipping.</p>
              </div>

              {/* Card 2: You receive exactly what you ordered */}
              <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                <CubeIcon className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2">You receive exactly what you ordered</h3>
                <p className="text-gray-600 text-sm">No surprises or informal sellers.</p>
              </div>

              {/* Card 3: 99% of the global catalog */}
              <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                <GlobeAltIcon className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2">99% of the global catalog</h3>
                <p className="text-gray-600 text-sm">Even hard-to-find cards.</p>
              </div>

              {/* Card 4: English-only cards */}
              <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                <TagIcon className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2">English-only cards</h3>
                <p className="text-gray-600 text-sm">Stronger long-term value and consistency.</p>
              </div>

              {/* Card 5: Fully professional platform */}
              <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                <BriefcaseIcon className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Fully professional platform</h3>
                <p className="text-gray-600 text-sm">No informal pages or improvised listings.</p>
              </div>

              {/* Card 6: Support on every purchase */}
              <div className="rounded-xl bg-white/40 border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Support on every purchase</h3>
                <p className="text-gray-600 text-sm">If anything goes wrong, we help you fix it.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
