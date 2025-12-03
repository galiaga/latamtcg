import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Return Policy | LatamTCG',
    description: 'Complete refund and return policy for LatamTCG. Learn your rights and how to process returns.',
    alternates: {
      canonical: 'https://latamtcg.com/en/returns',
    },
  };
}

export default async function ReturnsPage() {
  setRequestLocale('en');
  const t = await getTranslations();
  const email = 'hola@latamtcg.com';
  
  return (
    <main className="mx-auto max-w-prose px-4 py-12">
      <h1 className="text-3xl font-bold text-text mb-2">{t('returns.title')}</h1>
      <p className="text-sm text-mutedText italic mb-8">{t('returns.lastUpdated')}</p>
      
      <div className="prose prose-gray max-w-none">
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-text mb-4">{t('returns.summary')}</h2>
          <ul className="space-y-2 text-mutedText">
            <li>• {t('returns.summaryPoint1')}</li>
            <li>• {t('returns.summaryPoint2')}</li>
            <li>• {t('returns.summaryPoint3')}</li>
            <li>• {t('returns.summaryPoint4')}</li>
            <li>• {t('returns.summaryPoint5')}</li>
          </ul>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">{t('returns.eligibility')}</h2>
          <p className="text-mutedText mb-4">{t('returns.eligibilityText')}</p>
          <ol className="list-decimal list-inside space-y-2 text-mutedText mb-4">
            <li><strong>{t('returns.eligibility1')}</strong></li>
            <li><strong>{t('returns.eligibility2')}</strong></li>
            <li><strong>{t('returns.eligibility3')}</strong></li>
          </ol>
          <blockquote className="border-l-4 border-primary pl-4 italic text-mutedText">
            {t('returns.eligibilityNote')}
          </blockquote>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">{t('returns.timeframes')}</h2>
          <ul className="space-y-2 text-mutedText">
            <li>• <strong>{t('returns.timeframe1')}</strong></li>
            <li>• <strong>{t('returns.timeframe2')}</strong></li>
          </ul>
          <p className="text-mutedText mt-4">{t('returns.timeframeNote')}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">{t('returns.howToStartClaim')}</h2>
          <ol className="list-decimal list-inside space-y-4 text-mutedText">
            <li><strong>{t('returns.claimStep1', { email })}</strong></li>
            <li><strong>{t('returns.claimStep2')}</strong>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>{t('returns.claimStep2a')}</li>
                <li>{t('returns.claimStep2b')}</li>
              </ul>
            </li>
            <li>{t('returns.claimStep3')}</li>
            <li><strong>{t('returns.claimStep4')}</strong></li>
          </ol>
          <blockquote className="border-l-4 border-primary pl-4 italic text-mutedText mt-4">
            <strong>{t('returns.dispatchEvidence')}</strong>
          </blockquote>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">{t('returns.returnConditions')}</h2>
          <ul className="space-y-2 text-mutedText mb-4">
            <li>• {t('returns.returnCondition1')}</li>
            <li>• {t('returns.returnCondition2')}</li>
          </ul>
          <p className="text-mutedText mb-2">{t('returns.mayDenyRefunds')}</p>
          <ul className="list-disc list-inside space-y-1 text-mutedText">
            <li>{t('returns.denyReason1')}</li>
            <li>{t('returns.denyReason2')}</li>
            <li>{t('returns.denyReason3')}</li>
            <li>{t('returns.denyReason4')}</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">{t('returns.shippingCosts')}</h2>
          <ul className="space-y-2 text-mutedText">
            <li>• <strong>{t('returns.shippingCost1')}</strong></li>
            <li>• <strong>{t('returns.shippingCost2')}</strong></li>
            <li>• {t('returns.shippingCost3')}</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">{t('returns.fraudPrevention')}</h2>
          <p className="text-mutedText">{t('returns.fraudPreventionText')}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">{t('returns.refundMethods')}</h2>
          <p className="text-mutedText mb-4">{t('returns.refundMethodsText')}</p>
          <ul className="space-y-1 text-mutedText">
            <li>• <strong>{t('returns.refundMethod1')}</strong></li>
            <li>• <strong>{t('returns.refundMethod2')}</strong></li>
            <li>• <strong>{t('returns.refundMethod3')}</strong></li>
          </ul>
          <div className="bg-surface border border-border rounded-lg p-4 mt-4">
            <h3 className="text-lg font-semibold text-text mb-2">{t('returns.refundFee')}</h3>
            <p className="text-mutedText">{t('returns.refundFeeText')}</p>
          </div>
          <blockquote className="border-l-4 border-primary pl-4 italic text-mutedText mt-4">
            {t('returns.refundNote')}
          </blockquote>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-text mb-4">{t('returns.questions')}</h2>
          <p className="text-mutedText">
            {t('returns.questionsText', { email }).split(email)[0]}
            <a href={`mailto:${email}`} className="text-primary underline hover:text-primaryHover">
              {email}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}

