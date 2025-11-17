import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('howItWorks.title')} | LatamTCG`,
    description: t('howItWorks.heroSubtitle'),
  };
}

export default async function HowItWorksPage() {
  const t = await getTranslations();
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      {/* Breadcrumb */}
      <nav className="py-4" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-sm" style={{ color: 'var(--mutedText)' }}>
          <li>
            <Link href="/" className="hover:opacity-80" style={{ color: 'var(--mutedText)' }}>
              {t('printing.home')}
            </Link>
          </li>
          <li style={{ color: 'var(--mutedText)', opacity: 0.6 }}>/</li>
          <li style={{ color: 'var(--text)' }}>{t('howItWorks.title')}</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <header className="py-12 md:py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">
          {t('howItWorks.heroTitle')}
        </h1>
        <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'var(--mutedText)' }}>
          {t('howItWorks.heroSubtitle')}
        </p>
        <Link 
          href="/mtg/search" 
          className="inline-flex items-center px-5 py-3 font-medium rounded-xl text-white transition hover:opacity-90"
          style={{ backgroundColor: '#9B7BFF' }}
        >
          {t('howItWorks.browseCards')}
        </Link>
      </header>

      {/* How it works - 4 steps */}
      <section className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">{t('howItWorks.howItWorksTitle')}</h2>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.step1Title')}</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.step1Text')}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.step2Title')}</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.step2Text')}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.step3Title')}</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.step3Text')}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              4
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.step4Title')}</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.step4Text')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why trust us - 4-point grid */}
      <section className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">{t('howItWorks.whyTrustUs')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(155, 123, 255, 0.1)' }}>
              <svg className="w-8 h-8" style={{ color: '#9B7BFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.optimizedExperience')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.optimizedText')}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(155, 123, 255, 0.1)' }}>
              <svg className="w-8 h-8" style={{ color: '#9B7BFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.payInClp')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.payInClpText')}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(155, 123, 255, 0.1)' }}>
              <svg className="w-8 h-8" style={{ color: '#9B7BFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.safeGuaranteedDelivery')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.safeDeliveryText')}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(155, 123, 255, 0.1)' }}>
              <svg className="w-8 h-8" style={{ color: '#9B7BFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.builtByPlayers')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.builtByPlayersText')}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">{t('howItWorks.faq')}</h2>
        <div className="space-y-6">
          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.howLongDelivery')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.deliveryTimeText')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.areCardsNewOrUsed')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.newOrUsedText')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.whatIfCantSecure')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.cantSecureText')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.canTrackOrder')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.trackOrderText')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.whyPricesInClp')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.whyPricesClpText')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('howItWorks.howPricesCalculated')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.howPricesCalcText')}
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-12 md:py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-base md:text-lg mb-8" style={{ color: 'var(--mutedText)' }}>
            {t('howItWorks.closingCta')}
          </p>
          <Link 
            href="/mtg/search" 
            className="inline-flex items-center px-5 py-3 font-medium rounded-xl text-white transition hover:opacity-90"
            style={{ backgroundColor: '#9B7BFF' }}
          >
            {t('howItWorks.startSearchingCards')}
          </Link>
        </div>
      </section>
    </div>
  )
}
