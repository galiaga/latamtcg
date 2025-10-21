import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions | LatamTCG',
  description: 'Read LatamTCG\'s terms and conditions for using our services and purchasing Magic: The Gathering cards.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">Terms & Conditions</h1>
      <div className="mt-6 space-y-8 text-mutedText">
        
        <section>
          <h2 className="text-lg font-medium text-text mb-3">Acceptance of Terms</h2>
          <p>
            By accessing and using LatamTCG's website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Use License</h2>
          <div className="space-y-4">
            <p>
              Permission is granted to temporarily download one copy of the materials on LatamTCG's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="space-y-1 ml-4">
              <li>• modify or copy the materials</li>
              <li>• use the materials for any commercial purpose or for any public display</li>
              <li>• attempt to reverse engineer any software contained on the website</li>
              <li>• remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Product Information</h2>
          <div className="space-y-4">
            <p>
              We strive to provide accurate information about our Magic: The Gathering cards, including condition, rarity, and pricing. However, we make no warranties about the completeness, reliability, or accuracy of this information.
            </p>
            <p>
              Product photos and descriptions are for reference only. Slight variations may occur between listed and delivered items due to grading interpretation or supplier updates.
            </p>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">Important Disclaimers</h3>
              <ul className="space-y-1">
                <li>• Card conditions are assessed by our team and may vary from individual interpretations</li>
                <li>• Prices are subject to market fluctuations and may change without notice</li>
                <li>• Product availability is not guaranteed until order confirmation</li>
                <li>• We reserve the right to refuse service to anyone</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Pricing & Payment Terms</h2>
          <div className="space-y-4">
            <p>
              All prices are displayed in Chilean Pesos (CLP) and include consolidation and importation costs. Prices are rounded up to multiples of $500 CLP for simplicity and transparency. Our pricing formula considers TCGPlayer USD prices, current exchange rates, tiered markup based on card value, and daily shipping costs.
            </p>
            <p>
              <strong>Purchase Limits:</strong> To ensure fair access to all players, each user may purchase up to 4 copies of the same card within a rolling 3-day window. This limit applies to each individual printing and includes copies in your cart plus any copies from orders placed in the last 3 days. Anonymous users have cart-level limits only, while signed-in users have cross-order limits enforced at checkout.
            </p>
            <p>
              All payments must be made in full at the time of purchase. We accept major credit cards and PayPal. All payments are processed in Chilean Pesos (CLP). LatamTCG reserves the right to hold or cancel orders flagged by our payment processor for fraud review.
            </p>
            <p>By providing payment information, you represent and warrant that:</p>
            <ul className="space-y-1 ml-4">
              <li>• You have the legal right to use the payment method</li>
              <li>• The information provided is accurate and complete</li>
              <li>• You authorize us to charge the payment method for your purchase</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Shipping & Delivery</h2>
          <div className="space-y-4">
            <p>
              We ship to addresses within Latin America. Shipping costs and delivery times vary by location. Risk of loss and title transfer to the buyer upon delivery to the carrier. LatamTCG is not responsible for courier delays but will assist in resolving delivery issues when possible. Claims for damage or wrong item must be reported within 48 hours of receipt with supporting evidence.
            </p>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">Shipping Responsibilities</h3>
              <ul className="space-y-1">
                <li>• We are responsible for packaging items securely</li>
                <li>• You are responsible for providing accurate shipping addresses</li>
                <li>• Delivery delays due to carrier issues are not our responsibility</li>
                <li>• Signature may be required for high-value orders</li>
                <li>• For high-value orders, LatamTCG may require tracked shipping and signature upon delivery</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Returns & Refunds</h2>
          <p>
            Our return and refund process is described in detail on our{' '}
            <a href="/returns" className="text-primary underline hover:text-primaryHover">
              Refunds & Returns
            </a>
            {' '}page. Returns must follow our verification process, including photo evidence when applicable, and must be initiated within the specified timeframes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Evidence & Fraud Prevention</h2>
          <div className="space-y-4">
            <p>
              LatamTCG captures photographic evidence of certain orders before dispatch. In case of disputes or refund requests, customers may be asked to provide photos of the received item and packaging within 48 hours of delivery.
            </p>
            <p>
              Refunds or replacements will only be processed after verifying this evidence. LatamTCG reserves the right to deny claims lacking sufficient proof or those inconsistent with our shipping records.
            </p>
            <p>
              Fraudulent or counterfeit return attempts will result in account restriction and possible payment dispute actions.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Intellectual Property</h2>
          <div className="space-y-4">
            <p>
              Magic: The Gathering is a trademark of Wizards of the Coast LLC. LatamTCG is not affiliated with, endorsed by, or sponsored by Wizards of the Coast.
            </p>
            <p>
              All content on this website, including text, graphics, logos, and software, is the property of LatamTCG and is protected by copyright laws.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Limitation of Liability</h2>
          <p>
            In no event shall LatamTCG or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on LatamTCG's website, even if LatamTCG or an authorized representative has been notified orally or in writing of the possibility of such damage.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Privacy Policy</h2>
          <p>
            Your privacy is important to us. Please review our{' '}
            <a href="/privacy" className="text-primary underline hover:text-primaryHover">
              Privacy Policy
            </a>
            {' '}to understand how we collect, use, and protect your information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Applicable Law</h2>
          <p>
            All transactions are subject to applicable Chilean consumer protection laws (Law No. 19.496).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Changes to Terms</h2>
          <p>
            LatamTCG reserves the right to revise these terms at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms and conditions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Contact Information</h2>
          <p>
            If you have any questions about these Terms & Conditions, please contact us at{' '}
            <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
              hola@latamtcg.com
            </a>
            .
          </p>
        </section>

        <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
          <p className="text-sm text-mutedText">
            <strong>Last updated:</strong> October 16, 2025
          </p>
        </div>
      </div>
    </main>
  );
}
