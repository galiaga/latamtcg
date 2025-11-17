import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('about.title')} | LatamTCG`,
    description: t('about.missionText'),
  };
}

export default async function AboutPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">{t('about.title')}</h1>
      <div className="mt-6 space-y-8 text-mutedText">
        
        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('about.ourMission')}</h2>
          <p>
            {t('about.missionText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('about.whatWeDo')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">{t('about.trustedMarketplace')}</h3>
              <p>
                {t('about.trustedMarketplaceText')}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('about.reliableQuality')}</h3>
              <p>
                {t('about.reliableQualityText')}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-text">{t('about.localFocus')}</h3>
              <p>
                {t('about.localFocusText')}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('about.ourValues')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">{t('about.authenticity')}</h3>
              <p>{t('about.authenticityText')}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">{t('about.transparency')}</h3>
              <p>{t('about.transparencyText')}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">{t('about.customerService')}</h3>
              <p>{t('about.customerServiceText')}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-text mb-2">{t('about.community')}</h3>
              <p>{t('about.communityText')}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('about.ourTeam')}</h2>
          <p>
            {t('about.teamText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('about.whyChoose')}</h2>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">{t('about.authenticCardsOnly')}</h3>
                <p>{t('about.authenticCardsOnlyText')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">{t('about.qualityGuaranteed')}</h3>
                <p>{t('about.qualityGuaranteedText')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">{t('about.fairPricing')}</h3>
                <p>{t('about.fairPricingText')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">{t('about.fastSecureDelivery')}</h3>
                <p>{t('about.fastSecureDeliveryText')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">✓</span>
              <div>
                <h3 className="font-medium text-text">{t('about.communityDriven')}</h3>
                <p>{t('about.communityDrivenText')}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
          <p className="text-text">
            <strong>{t('about.readyToExplore')}</strong><br />
            {t('about.startBrowsing')}{' '}
            <a href="/mtg/search" className="text-primary underline hover:text-primaryHover">
              {t('about.collection')}
            </a>
            {' '}{t('about.orContact')}{' '}
            <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
              hola@latamtcg.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
