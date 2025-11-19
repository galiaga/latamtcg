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

      {/* Section 1: How it works - 4 steps */}
      <section id="how-it-works" className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">{t('howItWorks.heroTitle')}</h2>
        <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto text-center" style={{ color: 'var(--mutedText)' }}>
          {t('howItWorks.intro')}
        </p>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.steps.step1.title')}</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.steps.step1.body')}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.steps.step2.title')}</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.steps.step2.body')}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.steps.step3.title')}</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.steps.step3.body')}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              4
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.steps.step4.title')}</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.steps.step4.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Why trust LatamTCG */}
      <section className="py-12 md:py-16">
        <div className="rounded-lg p-8" style={{ backgroundColor: 'rgba(155, 123, 255, 0.05)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('trust.why.title')}</h2>
          <h3 className="text-xl font-semibold mb-4">{t('trust.why.subsection')}</h3>
          <p className="text-base md:text-lg mb-3" style={{ color: 'var(--mutedText)' }}>
            {t('trust.why.body')}
          </p>
          <ul className="list-disc list-inside mb-4 space-y-1" style={{ color: 'var(--mutedText)' }}>
            <li>{t('trust.why.option1')}</li>
            <li>{t('trust.why.option2')}</li>
          </ul>
          <p className="text-base md:text-lg" style={{ color: 'var(--mutedText)' }}>
            {t('trust.why.body2')}
          </p>
        </div>
      </section>

      {/* Section 3: Who we are */}
      <section id="about" className="py-12 md:py-16">
        <div className="rounded-lg p-8" style={{ backgroundColor: 'rgba(155, 123, 255, 0.05)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('trust.whoWeAre.title')}</h2>
          <p className="text-base md:text-lg mb-4" style={{ color: 'var(--mutedText)' }}>
            {t('trust.whoWeAre.body')}
          </p>
          <p className="text-base md:text-lg mb-4" style={{ color: 'var(--mutedText)' }}>
            {t('trust.whoWeAre.body2')}
          </p>
          <p className="text-sm" style={{ color: 'var(--mutedText)' }}>
            {t('trust.whoWeAre.contact')}
          </p>
        </div>
      </section>

      {/* Section 4: Payment Security */}
      <section className="py-12 md:py-16">
        <div className="rounded-lg p-8" style={{ backgroundColor: 'rgba(155, 123, 255, 0.05)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('trust.payment.title')}</h2>
          <p className="text-base md:text-lg mb-4" style={{ color: 'var(--mutedText)' }}>
            {t('trust.payment.body')}
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2" style={{ color: 'var(--mutedText)' }}>
            <li>{t('trust.payment.bullet1')}</li>
            <li>{t('trust.payment.bullet2')}</li>
            <li>{t('trust.payment.bullet3')}</li>
          </ul>
          <p className="text-base md:text-lg" style={{ color: 'var(--mutedText)' }}>
            {t('trust.payment.closing')}
          </p>
        </div>
      </section>

      {/* Section 5: Delivery & Shipping */}
      <section id="delivery" className="py-12 md:py-16">
        <div className="rounded-lg p-8" style={{ backgroundColor: 'rgba(155, 123, 255, 0.05)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('howItWorks.delivery.title')}</h2>
          <p className="text-base md:text-lg mb-6" style={{ color: 'var(--mutedText)' }}>
            {t('howItWorks.delivery.intro')}
          </p>
          
          <div className="space-y-6 mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">{t('howItWorks.delivery.pickup.title')}</h3>
              <p className="text-base" style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.delivery.pickup.description')}
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">{t('howItWorks.delivery.courier.title')}</h3>
              <p className="text-base" style={{ color: 'var(--mutedText)' }}>
                {t('howItWorks.delivery.courier.description')}
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">{t('howItWorks.delivery.protection.title')}</h3>
            <p className="text-base" style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.delivery.protection.body')}{' '}
              <Link href="/returns" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>
                {t('howItWorks.delivery.protection.link')}
              </Link>
              .
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">{t('howItWorks.delivery.timing.title')}</h3>
            <p className="text-base mb-2" style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.delivery.timing.pickup')}
            </p>
            <p className="text-base" style={{ color: 'var(--mutedText)' }}>
              {t('howItWorks.delivery.timing.courier')}
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Return Policy Summary */}
      <section id="returns" className="py-12 md:py-16">
        <div className="rounded-lg p-8" style={{ backgroundColor: 'rgba(155, 123, 255, 0.05)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('trust.returns.title')}</h2>
          <p className="text-base md:text-lg mb-3" style={{ color: 'var(--mutedText)' }}>
            {t('trust.returns.body')}
          </p>
          <ul className="list-disc list-inside mb-4 space-y-1" style={{ color: 'var(--mutedText)' }}>
            <li>{t('trust.returns.point1')}</li>
            <li>{t('trust.returns.point2')}</li>
            <li>{t('trust.returns.point3')}</li>
          </ul>
          <p className="text-base md:text-lg mb-2" style={{ color: 'var(--mutedText)' }}>
            {t('trust.returns.body2')}
          </p>
          <p className="text-base md:text-lg mb-2" style={{ color: 'var(--mutedText)' }}>
            {t('trust.returns.body3')}
          </p>
          <p className="text-sm" style={{ color: 'var(--mutedText)' }}>
            {t('trust.returns.fullDetails')}{' '}
            <Link href="/returns" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>
              {t('trust.returns.policyLink')}
            </Link>
            {t('trust.returns.fullDetailsEnd', { defaultValue: '' })}
          </p>
        </div>
      </section>

      {/* Section 6: FAQ */}
      <section id="faq" className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">{t('faq.title')}</h2>
        <div className="space-y-6">
          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('faq.items.localPickup.question')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('faq.items.localPickup.answer')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('faq.items.chilexpressShipping.question')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('faq.items.chilexpressShipping.answer')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('faq.items.shippingCost.question')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('faq.items.shippingCost.answer')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('faq.items.tracking.question')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('faq.items.tracking.answer')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('faq.items.chileanCard.question')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('faq.items.chileanCard.answer')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('faq.items.customs.question')}</h3>
            <p className="mb-2" style={{ color: 'var(--mutedText)' }}>
              {t('faq.items.customs.answer')}
            </p>
            <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--mutedText)' }}>
              <li>{t('faq.items.customs.list1')}</li>
              <li>{t('faq.items.customs.list2')}</li>
              <li>{t('faq.items.customs.list3')}</li>
              <li>{t('faq.items.customs.list4')}</li>
            </ul>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('faq.items.newOrUsed.question')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('faq.items.newOrUsed.answer')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('faq.items.cantSecure.question')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('faq.items.cantSecure.answer')}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">{t('faq.items.help.question')}</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              {t('faq.items.help.answer')}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Contact */}
      <section id="contact" className="py-12 md:py-16">
        <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'rgba(155, 123, 255, 0.05)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('contact.quick.title')}</h2>
          <p className="text-base md:text-lg mb-2" style={{ color: 'var(--mutedText)' }}>
            {t('contact.quick.text')}{' '}
            <a href="mailto:hola@latamtcg.com" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>
              {t('contact.quick.email')}
            </a>.
          </p>
          <p className="text-sm" style={{ color: 'var(--mutedText)' }}>
            {t('contact.getBackWithin24')}
          </p>
          <div className="mt-6">
            <Link 
              href="/contact" 
              className="inline-flex items-center px-5 py-3 font-medium rounded-xl transition hover:opacity-90"
              style={{ backgroundColor: '#9B7BFF', color: 'white' }}
            >
              {t('contact.title')}
            </Link>
          </div>
        </div>
      </section>

      {/* Legal Pages Links */}
      <section className="py-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/terms" className="hover:opacity-80 underline" style={{ color: 'var(--mutedText)' }}>
            {t('footer.termsConditions')}
          </Link>
          <Link href="/privacy" className="hover:opacity-80 underline" style={{ color: 'var(--mutedText)' }}>
            {t('footer.privacyPolicy')}
          </Link>
          <Link href="/returns" className="hover:opacity-80 underline" style={{ color: 'var(--mutedText)' }}>
            {t('footer.refundsReturns')}
          </Link>
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
