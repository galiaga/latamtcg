import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('help.title')} – LatamTCG`,
    description: t('help.title'),
  };
}

export default async function HelpPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">{t('help.title')}</h1>
      <div className="mt-6 space-y-8 text-mutedText">
        
        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('help.pricingCurrency')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">{t('help.whyClp')}</h3>
              <p>{t('help.whyClpText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.howPricesCalculated')}</h3>
              <p>{t('help.howPricesText')}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('help.purchaseLimits')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">{t('help.whyLimits')}</h3>
              <p>{t('help.whyLimitsText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.howLimitsWork')}</h3>
              <p>{t('help.howLimitsText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.canExceedLimit')}</h3>
              <p>{t('help.canExceedText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.limitsDifferentPrintings')}</h3>
              <p>{t('help.limitsDifferentText')}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('help.orderingShipping')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">{t('help.howToPlaceOrder')}</h3>
              <p>{t('help.howToPlaceText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.shippingOptions')}</h3>
              <p>{t('help.shippingOptionsText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.shipInternationally')}</h3>
              <p>
                {t('help.shipInternationalText', { email: 'hola@latamtcg.com' }).replace('{email}', '').trim()}
                <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
                  hola@latamtcg.com
                </a>.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('help.cardQuality')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">{t('help.ensureAuthenticity')}</h3>
              <p>{t('help.ensureAuthText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.cardCondition')}</h3>
              <p>{t('help.cardConditionText')}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('help.returnsRefunds')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">{t('help.returnPolicy')}</h3>
              <p>{t('help.returnPolicyText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.protectWhenBuying')}</h3>
              <p>{t('help.protectText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.howToInitiateReturn')}</h3>
              <p>
                {t('help.initiateReturnText', { email: 'hola@latamtcg.com' }).replace('{email}', '').trim().split('hola@latamtcg.com')[0]}
                <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
                  hola@latamtcg.com
                </a>
                {' '}{t('help.initiateReturnText', { email: 'hola@latamtcg.com' }).replace('{email}', '').trim().split('hola@latamtcg.com')[1] || ''}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('help.accountSecurity')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">{t('help.howToCreateAccount')}</h3>
              <p>{t('help.createAccountText')}</p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('help.isPaymentSecure')}</h3>
              <p>{t('help.paymentSecureText')}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
          <p className="text-text">
            <strong>{t('help.stillHaveQuestions')}</strong>{' '}
            {t('help.stillHaveQuestionsText', { email: 'hola@latamtcg.com' }).replace('{email}', '').trim().split('hola@latamtcg.com')[0]}
            <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
              hola@latamtcg.com
            </a>
            {' '}{t('help.stillHaveQuestionsText', { email: 'hola@latamtcg.com' }).replace('{email}', '').trim().split('hola@latamtcg.com')[1] || ''}
          </p>
        </div>
      </div>
    </main>
  );
}
