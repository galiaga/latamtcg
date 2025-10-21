import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ – LatamTCG | Buying, Selling & Shipping Cards in Latin America',
  description: 'Frequently asked questions about LatamTCG, our services, and Magic: The Gathering cards.',
};

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">Frequently Asked Questions</h1>
      <div className="mt-6 space-y-8 text-mutedText">
        
        <section>
          <h2 className="text-lg font-medium text-text mb-3">Pricing & Currency</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">Why are prices shown in Chilean Pesos (CLP)?</h3>
              <p>Our prices are displayed in Chilean Pesos (CLP) and include consolidation and importation costs. Prices are rounded up to multiples of $500 CLP for simplicity. This ensures transparent pricing that reflects the true cost of bringing cards to Chile, including shipping, customs, and handling fees.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">How are prices calculated?</h3>
              <p>Our pricing formula considers the TCGPlayer USD price, current exchange rates, tiered markup based on card value, and daily shipping costs. Cards under $5 USD have a 90% markup, cards between $5-20 USD have a 70% markup, and cards over $20 USD have a 50% markup. All prices include a minimum of $500 CLP per card.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Purchase Limits</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">Why are there purchase limits?</h3>
              <p>To protect availability for all players, each user may buy up to 4 copies of the same card within a rolling 3-day window. This ensures fair access to popular cards and prevents hoarding.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">How do purchase limits work?</h3>
              <p>Purchase limits apply to each individual printing (exact card version). The limit counts all copies you have in your cart plus any copies from orders placed in the last 3 days. Anonymous users have cart-level limits only, while signed-in users have cross-order limits.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">Can I exceed the limit?</h3>
              <p>No, the system will prevent you from adding more copies than allowed. If you try to exceed the limit, you'll see a clear message explaining how many copies you already have committed and how many more you can add.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">Do limits apply to different printings of the same card?</h3>
              <p>Yes, limits apply to each specific printing (e.g., regular Lightning Bolt vs. foil Lightning Bolt are counted separately). This allows you to collect different versions while still preventing hoarding of any single printing.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Ordering & Shipping</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">How do I place an order?</h3>
              <p>Browse our Magic: The Gathering cards, add your desired items to the cart, and proceed to checkout. Payments can be made using major credit cards or PayPal.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">What are your shipping options?</h3>
              <p>We currently ship across Latin America with standard and express delivery options. Delivery times usually range from 3 to 7 business days, depending on your location and the seller's dispatch time.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">Do you ship internationally?</h3>
              <p>At this stage, LatamTCG focuses on serving players and collectors across Latin America. For international orders, please reach out to us at{' '}
                <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
                  hola@latamtcg.com
                </a>.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Card Quality & Authenticity</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">How do you ensure card authenticity?</h3>
              <p>Every card listed on LatamTCG is verified by our team or trusted sellers. We only work with reputable sources, and we actively monitor listings to ensure that all cards are genuine.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">What about card condition?</h3>
              <p>We only list cards in good playable or collectible condition — equivalent to <strong>Lightly Played (LP)</strong> or better according to TCGPlayer standards.<br />
              Cards in <strong>Heavily Played (HP)</strong> or <strong>Damaged (DMG)</strong> condition are <strong>not sold</strong> on LatamTCG.</p>
              <p className="mt-2">This ensures that all cards meet a consistent quality standard, even before we introduce detailed grading options in the future.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Returns & Refunds</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">What is your return policy?</h3>
              <p>Returns are accepted within <strong>30 days</strong> for sealed products.<br />
              Single cards may be returned within <strong>7 days</strong> if the received condition differs from the description or if an incorrect item was shipped.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">How can I protect myself when buying cards?</h3>
              <p>We recommend buyers <strong>record a short video</strong> when opening their package, showing the unopened envelope and its contents. This helps resolve any disputes quickly and fairly.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">How do I initiate a return?</h3>
              <p>Contact us at{' '}
                <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
                  hola@latamtcg.com
                </a>
                {' '}with your order number and reason for return. Our support team will review your case and guide you through the process.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Account & Security</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">How do I create an account?</h3>
              <p>Click "Sign Up" in the top-right corner and complete the registration process. Creating an account allows you to track orders, manage your listings, and save your favorite cards.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">Is my payment information secure?</h3>
              <p>Absolutely. LatamTCG uses industry-standard encryption and secure payment gateways. Your full payment details are never stored on our servers.</p>
            </div>
          </div>
        </section>

        <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
          <p className="text-text">
            <strong>Still have questions?</strong> Reach out to us at{' '}
            <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
              hola@latamtcg.com
            </a>
            {' '}— we'll be happy to help!
          </p>
        </div>
      </div>
    </main>
  );
}
