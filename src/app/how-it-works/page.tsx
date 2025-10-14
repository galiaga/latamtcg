import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "How It Works | LatamTCG — Buy Magic cards in CLP, hassle-free",
  description:
    "Buy Magic: The Gathering cards in Chile and LATAM with LatamTCG. Pay in CLP, no international cards or paperwork. We secure your cards and deliver them to your door.",
}

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      {/* Breadcrumb */}
      <nav className="py-4" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-sm" style={{ color: 'var(--mutedText)' }}>
          <li>
            <Link href="/" className="hover:opacity-80" style={{ color: 'var(--mutedText)' }}>
              Home
            </Link>
          </li>
          <li style={{ color: 'var(--mutedText)', opacity: 0.6 }}>/</li>
          <li style={{ color: 'var(--text)' }}>How it works</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <header className="py-12 md:py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">
          Your favorite card, without borders.
        </h1>
        <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'var(--mutedText)' }}>
          LatamTCG lets you get any Magic: The Gathering card at the best available price—with total convenience. You place the order, we handle the rest.
        </p>
        <Link 
          href="/mtg/search" 
          className="inline-flex items-center px-5 py-3 font-medium rounded-xl text-white transition hover:opacity-90"
          style={{ backgroundColor: '#9B7BFF' }}
        >
          Browse cards
        </Link>
      </header>

      {/* How it works - 4 steps */}
      <section className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">How it works</h2>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Find your card</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                Search by name, set, or variant. We keep the official catalog up to date, with prices shown in your local currency (CLP).
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Place your order</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                Add the cards you want to the cart, pay in your local currency with familiar payment methods, and confirm your purchase. No international cards required, no hidden fees.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">We secure it for you</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                Our team sources your order directly from top global providers to get your cards at the best price and in perfect condition.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#9B7BFF' }}>
              4
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Receive it at your door</h3>
              <p style={{ color: 'var(--mutedText)' }}>
                We'll keep you posted at every step. Deliveries usually take 10–15 business days, depending on availability. If something can't be secured, we'll notify you and offer a refund or a replacement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why trust us - 4-point grid */}
      <section className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">Why trust us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(155, 123, 255, 0.1)' }}>
              <svg className="w-8 h-8" style={{ color: '#9B7BFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-3">Optimized experience</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              No hassles or paperwork. We do the heavy lifting for you.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(155, 123, 255, 0.1)' }}>
              <svg className="w-8 h-8" style={{ color: '#9B7BFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-3">Pay in CLP with local methods</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              Check out easily, no FX headaches or international banks.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(155, 123, 255, 0.1)' }}>
              <svg className="w-8 h-8" style={{ color: '#9B7BFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-3">Safe, guaranteed delivery</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              We support you until the order is in your hands.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(155, 123, 255, 0.1)' }}>
              <svg className="w-8 h-8" style={{ color: '#9B7BFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-3">Built by and for players</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              We're part of the LATAM TCG community. We know what you expect.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">How long does delivery take?</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              Typically 10–15 business days. We'll notify you at every stage.
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">Are cards new or used?</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              All cards come from verified stores that follow international standards for card condition and authenticity.
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">What if an item can't be secured?</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              We'll notify you and you can choose a replacement or a full refund.
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3">Can I track my order status?</h3>
            <p style={{ color: 'var(--mutedText)' }}>
              Yes. You'll receive email updates and can check your order status in your LatamTCG account.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-12 md:py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-base md:text-lg mb-8" style={{ color: 'var(--mutedText)' }}>
            LatamTCG connects you to the global Magic marketplace—without borders or complications. Thousands of cards, one click, and the peace of mind of getting exactly what you want.
          </p>
          <Link 
            href="/mtg/search" 
            className="inline-flex items-center px-5 py-3 font-medium rounded-xl text-white transition hover:opacity-90"
            style={{ backgroundColor: '#9B7BFF' }}
          >
            Start searching cards
          </Link>
        </div>
      </section>
    </div>
  )
}
