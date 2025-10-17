import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund & Return Policy — LatamTCG (Chile, MVP)',
  description: 'Learn about LatamTCG\'s refund and return policy for Magic: The Gathering cards in Chile.',
};

export default function ReturnsPage() {
  return (
    <main className="mx-auto max-w-prose px-4 py-12">
      <h1 className="text-3xl font-bold text-text mb-2">Refund & Return Policy — LatamTCG (Chile, MVP)</h1>
      <p className="text-sm text-mutedText italic mb-8">Last updated: October 16, 2025 (America/Santiago)</p>
      
      <div className="prose prose-gray max-w-none">
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-text mb-4">Summary (TL;DR)</h2>
          <ul className="space-y-2 text-mutedText">
            <li>• We accept returns <strong>only</strong> for: <strong>wrong item</strong>, <strong>shipping damage</strong>, or <strong>sealed product defect</strong>.</li>
            <li>• Report issues within <strong>48 hours</strong> of delivery (sealed defects: within <strong>7 days</strong>).</li>
            <li>• <strong>No change-of-mind returns</strong> on single cards.</li>
            <li>• LatamTCG <strong>captures a photo at dispatch</strong> for each qualifying order; we'll compare it with your evidence.</li>
            <li>• Refunds are issued <strong>after verification</strong> (and, if required, after inspecting the returned item).</li>
          </ul>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">Eligibility</h2>
          <p className="text-mutedText mb-4">We accept returns/refunds <strong>only</strong> in these cases:</p>
          <ol className="list-decimal list-inside space-y-2 text-mutedText mb-4">
            <li><strong>Wrong item received</strong> (different printing/version than what your order confirms).</li>
            <li><strong>Item damaged in transit</strong> (visible damage to product/packaging upon arrival).</li>
            <li><strong>Sealed product defect</strong> (e.g., tampered seal).</li>
          </ol>
          <blockquote className="border-l-4 border-primary pl-4 italic text-mutedText">
            We <strong>do not</strong> accept returns for single cards once opened/handled, except where there is <strong>clear proof</strong> of shipping damage or wrong item.
          </blockquote>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">Timeframes</h2>
          <ul className="space-y-2 text-mutedText">
            <li>• <strong>Wrong item / shipping damage:</strong> notify us within <strong>48 hours</strong> of delivery.</li>
            <li>• <strong>Sealed product defect:</strong> notify us within <strong>7 days</strong> of delivery.</li>
          </ul>
          <p className="text-mutedText mt-4">After these periods, we cannot process returns or refunds.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">How to Start a Claim</h2>
          <ol className="list-decimal list-inside space-y-4 text-mutedText">
            <li><strong>Email</strong> <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">hola@latamtcg.com</a> within the valid timeframe and include your <strong>order number</strong>.</li>
            <li>Attach <strong>evidence photos</strong>:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>The item as received (front view)</li>
                <li>The external packaging and <strong>packing slip/label</strong></li>
              </ul>
            </li>
            <li>We review within <strong>48 hours</strong>. If approved, we'll send a <strong>Return Authorization (RMA)</strong> or immediate resolution steps.</li>
            <li><strong>Refunds/replacements</strong> are processed <strong>within 5–7 business days</strong> after verification and, when applicable, after inspection of the returned item.</li>
          </ol>
          <blockquote className="border-l-4 border-primary pl-4 italic text-mutedText mt-4">
            <strong>Dispatch evidence:</strong> LatamTCG may capture a <strong>photo at dispatch</strong> (product + packing slip/label). Your claim will be verified against this record.
          </blockquote>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">Return Conditions</h2>
          <ul className="space-y-2 text-mutedText mb-4">
            <li>• Items must be returned in their <strong>original, unaltered condition</strong> and packaging.</li>
            <li>• Returns <strong>must</strong> be <strong>authorized</strong> in advance with an RMA.</li>
          </ul>
          <p className="text-mutedText mb-2">We may deny refunds when:</p>
          <ul className="list-disc list-inside space-y-1 text-mutedText">
            <li>There are signs of use/handling after delivery.</li>
            <li>The received item doesn't match the one we shipped.</li>
            <li>Evidence is insufficient or inconsistent with our dispatch records.</li>
            <li>Timeframes are missed.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">Shipping & Costs</h2>
          <ul className="space-y-2 text-mutedText">
            <li>• <strong>LatamTCG error / shipping damage / sealed defect:</strong> we cover return shipping.</li>
            <li>• <strong>Unauthorized or non-eligible returns:</strong> customer covers shipping; the package may be refused.</li>
            <li>• For <strong>high-value orders</strong> (threshold defined by LatamTCG), we may require <strong>tracked shipping and delivery signature</strong>.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">Fraud & Counterfeit Prevention</h2>
          <p className="text-mutedText">To protect our community, all claims are subject to verification. LatamTCG may <strong>deny or revoke</strong> refunds in cases of suspected <strong>fraud, counterfeit returns, or item tampering</strong>, and may restrict account access and/or submit payment disputes.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">Refund Methods</h2>
          <p className="text-mutedText mb-4">Refunds are issued in <strong>CLP</strong> using the <strong>original payment method</strong>:</p>
          <ul className="space-y-1 text-mutedText">
            <li>• <strong>Credit/Debit Card:</strong> 5–7 business days</li>
            <li>• <strong>Bank Transfer:</strong> 7–10 business days</li>
            <li>• <strong>PayPal:</strong> 3–5 business days</li>
          </ul>
          <blockquote className="border-l-4 border-primary pl-4 italic text-mutedText mt-4">
            Initial shipping fees are refunded <strong>only</strong> when the issue is attributable to LatamTCG (wrong item, shipping damage, sealed defect).
          </blockquote>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">Questions</h2>
          <p className="text-mutedText">We're here to help: <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">hola@latamtcg.com</a></p>
        </section>
      </div>
    </main>
  );
}
