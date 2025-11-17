import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('terms.title')} | LatamTCG`,
    description: t('terms.acceptanceText'),
  };
}

export default async function TermsPage() {
  const t = await getTranslations();
  const email = 'hola@latamtcg.com';
  
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">{t('terms.title')}</h1>
      <div className="mt-6 space-y-8 text-mutedText">
        
        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.acceptanceOfTerms')}</h2>
          <p>
            {t('terms.acceptanceText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.useLicense')}</h2>
          <div className="space-y-4">
            <p>
              {t('terms.useLicenseText')}
            </p>
            <ul className="space-y-1 ml-4">
              <li>• {t('terms.useLicense1')}</li>
              <li>• {t('terms.useLicense2')}</li>
              <li>• {t('terms.useLicense3')}</li>
              <li>• {t('terms.useLicense4')}</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.productInformation')}</h2>
          <div className="space-y-4">
            <p>
              {t('terms.productInfoText1')}
            </p>
            <p>
              {t('terms.productInfoText2')}
            </p>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">{t('terms.importantDisclaimers')}</h3>
              <ul className="space-y-1">
                <li>• {t('terms.disclaimer1')}</li>
                <li>• {t('terms.disclaimer2')}</li>
                <li>• {t('terms.disclaimer3')}</li>
                <li>• {t('terms.disclaimer4')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.pricingPayment')}</h2>
          <div className="space-y-4">
            <p>
              {t('terms.pricingText1')}
            </p>
            <p>
              {t('terms.pricingText2')}
            </p>
            <p>
              {t('terms.pricingText3')}
            </p>
            <p>{t('terms.pricingText4')}</p>
            <ul className="space-y-1 ml-4">
              <li>• {t('terms.pricingText4a')}</li>
              <li>• {t('terms.pricingText4b')}</li>
              <li>• {t('terms.pricingText4c')}</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.shippingDelivery')}</h2>
          <div className="space-y-4">
            <p>
              {t('terms.shippingText1')}
            </p>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">{t('terms.shippingResponsibilities')}</h3>
              <ul className="space-y-1">
                <li>• {t('terms.shippingResp1')}</li>
                <li>• {t('terms.shippingResp2')}</li>
                <li>• {t('terms.shippingResp3')}</li>
                <li>• {t('terms.shippingResp4')}</li>
                <li>• {t('terms.shippingResp5')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.returnsRefunds')}</h2>
          <p>
            {t('terms.returnsText').split('Reembolsos y Devoluciones')[0]}
            <Link href="/returns" className="text-primary underline hover:text-primaryHover">
              {t('footer.refundsReturns')}
            </Link>
            {' '}{t('terms.returnsText').split('Reembolsos y Devoluciones')[1]}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.evidenceFraud')}</h2>
          <div className="space-y-4">
            <p>
              {t('terms.evidenceText1')}
            </p>
            <p>
              {t('terms.evidenceText2')}
            </p>
            <p>
              {t('terms.evidenceText3')}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.intellectualProperty')}</h2>
          <div className="space-y-4">
            <p>
              {t('terms.ipText1')}
            </p>
            <p>
              {t('terms.ipText2')}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.limitationOfLiability')}</h2>
          <p>
            {t('terms.liabilityText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.privacyPolicy')}</h2>
          <p>
            {t('terms.privacyText').split('Política de privacidad')[0]}
            <Link href="/privacy" className="text-primary underline hover:text-primaryHover">
              {t('footer.privacyPolicy')}
            </Link>
            {' '}{t('terms.privacyText').split('Política de privacidad')[1]}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.applicableLaw')}</h2>
          <p>
            {t('terms.lawText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.changesToTerms')}</h2>
          <p>
            {t('terms.changesText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('terms.contactInformation')}</h2>
          <p>
            {t('terms.contactText', { email }).split(email)[0]}
            <a href={`mailto:${email}`} className="text-primary underline hover:text-primaryHover">
              {email}
            </a>.
          </p>
        </section>

        <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
          <p className="text-sm text-mutedText">
            <strong>{t('terms.lastUpdated')}</strong>
          </p>
        </div>
      </div>
    </main>
  );
}
