import PopularCards from '@/components/PopularCards'
import RandomButton from '@/components/RandomButton'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

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
    <div className="py-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="text-center py-4 px-4" aria-labelledby="hero-heading">
          <h1 id="hero-heading" className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
            Every card, always. With complete confidence.
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
            Buy Magic: The Gathering cards with a safe, professional, and fully reliable process. Getting exactly what you need has never been this trustworthy.
          </p>
          
          {/* Bullet List */}
          <ul className="text-left max-w-2xl mx-auto mb-6 space-y-3 text-base text-gray-700">
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
          
          <div className="mt-6">
            <RandomButton />
          </div>
        </section>

        {/* Popular Cards Section */}
        <PopularCards />
      </div>
    </div>
  )
}

