import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | LatamTCG',
  description: 'Learn about LatamTCG, your trusted source for Magic: The Gathering cards in Latin America.',
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">About LatamTCG</h1>
      <div className="mt-6 space-y-8 text-mutedText">
        
        <section>
          <h2 className="text-lg font-medium text-text mb-3">Our Mission</h2>
          <p>
            LatamTCG was created to make buying and selling Magic: The Gathering cards easier, safer, and more transparent — starting in Chile.<br />
            Our mission is to build a trusted platform where players and collectors can find authentic, well-conditioned cards at fair prices, supported by reliable local delivery.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">What We Do</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">Trusted Marketplace</h3>
              <p>
                LatamTCG allows players and collectors in Chile to buy and sell Magic: The Gathering cards safely. Every listing is reviewed to ensure authenticity and quality.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-text">Reliable Quality</h3>
              <p>
                We only feature cards in good playable or collectible condition — equivalent to <em>Lightly Played (LP)</em> or better according to TCGPlayer standards.<br />
                Cards in <em>Heavily Played (HP)</em> or <em>Damaged (DMG)</em> condition are <strong>not sold</strong> on LatamTCG.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-text">Local Focus, Regional Vision</h3>
              <p>
                We're starting in Chile, but our goal is to connect players and collectors throughout Latin America.<br />
                LatamTCG aims to become the region's most trusted destination for trading card games.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">Authenticity</h3>
              <p>Every card sold on LatamTCG is verified for authenticity. No counterfeits, no compromises.</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">Transparency</h3>
              <p>Clear pricing, honest condition descriptions, and straightforward return policies.</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">Customer Service</h3>
              <p>We respond quickly and clearly to all inquiries. Your satisfaction and confidence matter most.</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">Community</h3>
              <p>We're players too — and we want to help grow the Magic: The Gathering community, starting locally and expanding together.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Our Team</h2>
          <p>
            LatamTCG was founded by passionate players and collectors who understand how difficult it can be to find trustworthy sellers and fair prices in the region.<br />
            Our team combines years of experience in digital product development and the TCG world to deliver a simple, reliable, and community-focused experience.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Why Choose LatamTCG?</h2>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">Authentic Cards Only</h3>
                <p>Every card is verified for authenticity.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">Quality Guaranteed</h3>
                <p>Only cards LP or better, no HP or Damaged cards.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">Fair Pricing</h3>
                <p>Prices reflect real market conditions.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">Fast & Secure Delivery</h3>
                <p>Reliable nationwide shipping within Chile.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">Community-Driven</h3>
                <p>Built by and for Magic: The Gathering fans.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
          <p className="text-text">
            <strong>Ready to explore Chile's trusted Magic marketplace?</strong><br />
            Start browsing our{' '}
            <a href="/mtg/search" className="text-primary underline hover:text-primaryHover">
              collection
            </a>
            {' '}or contact us at{' '}
            <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
              hola@latamtcg.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
