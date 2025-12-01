import PopularCards from '@/components/PopularCards'
import RandomButton from '@/components/RandomButton'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations()
  return {
    title: t('home.welcome'),
    description: t('home.subtitle'),
    alternates: {
      canonical: 'https://latamtcg.com',
    },
    openGraph: {
      title: t('home.welcome'),
      description: t('home.subtitle'),
      url: 'https://latamtcg.com',
    },
    twitter: {
      title: t('home.welcome'),
      description: t('home.subtitle'),
    },
  }
}

export default async function Home() {
  const t = await getTranslations()
  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="text-center py-4 px-4" aria-labelledby="hero-heading">
          <h1 id="hero-heading" className="text-4xl md:text-5xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
            {t('home.welcome')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>
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
