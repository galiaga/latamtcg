import PopularCards from '@/components/PopularCards'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { 
  ShieldCheckIcon, 
  CubeIcon, 
  GlobeAltIcon, 
  TagIcon, 
  BriefcaseIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Buy Magic: The Gathering Cards in Chile | Every Card, Always | LatamTCG',
    description: 'Find all the Magic: The Gathering cards you need in English and buy with complete confidence. A professional, secure platform with no informal sellers. Always receive exactly what you ordered.',
    alternates: {
      canonical: 'https://latamtcg.com/en',
    },
    openGraph: {
      title: 'Buy Magic: The Gathering Cards in Chile | Every Card, Always | LatamTCG',
      description: 'Find all the Magic: The Gathering cards you need in English and buy with complete confidence. A professional, secure platform with no informal sellers.',
      url: 'https://latamtcg.com/en',
    },
    twitter: {
      title: 'Buy Magic: The Gathering Cards in Chile | Every Card, Always | LatamTCG',
      description: 'Find all the Magic: The Gathering cards you need in English and buy with complete confidence.',
    },
  }
}

export default async function EnglishHome() {
  // Force English locale for this route
  setRequestLocale('en')
  
  return (
    <div className="py-4">
      <div className="max-w-7xl mx-auto">
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

