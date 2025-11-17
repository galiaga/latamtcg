import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('privacy.title')} | LatamTCG`,
    description: t('privacy.introText'),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations();
  const email = 'hola@latamtcg.com';
  
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">{t('privacy.title')}</h1>
      <div className="mt-6 space-y-8 text-mutedText">
        
        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.introduction')}</h2>
          <p>
            {t('privacy.introText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.informationWeCollect')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">{t('privacy.personalInformation')}</h3>
              <p>{t('privacy.personalInfoText')}</p>
              <ul className="mt-2 space-y-1 ml-4">
                <li>• {t('privacy.personalInfo1')}</li>
                <li>• {t('privacy.personalInfo2')}</li>
                <li>• {t('privacy.personalInfo3')}</li>
                <li>• {t('privacy.personalInfo4')}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-text">{t('privacy.automaticallyCollected')}</h3>
              <p>{t('privacy.autoCollectedText')}</p>
              <ul className="mt-2 space-y-1 ml-4">
                <li>• {t('privacy.autoCollected1')}</li>
                <li>• {t('privacy.autoCollected2')}</li>
                <li>• {t('privacy.autoCollected3')}</li>
                <li>• {t('privacy.autoCollected4')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.howWeUse')}</h2>
          <div className="space-y-4">
            <p>{t('privacy.howWeUseText')}</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="font-medium text-text mb-2">{t('privacy.serviceProvision')}</h3>
                <ul className="space-y-1 text-sm">
                  <li>• {t('privacy.serviceProv1')}</li>
                  <li>• {t('privacy.serviceProv2')}</li>
                  <li>• {t('privacy.serviceProv3')}</li>
                  <li>• {t('privacy.serviceProv4')}</li>
                </ul>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="font-medium text-text mb-2">{t('privacy.communication')}</h3>
                <ul className="space-y-1 text-sm">
                  <li>• {t('privacy.comm1')}</li>
                  <li>• {t('privacy.comm2')}</li>
                </ul>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="font-medium text-text mb-2">{t('privacy.websiteOperation')}</h3>
                <ul className="space-y-1 text-sm">
                  <li>• {t('privacy.websiteOp1')}</li>
                  <li>• {t('privacy.websiteOp2')}</li>
                </ul>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="font-medium text-text mb-2">{t('privacy.legalCompliance')}</h3>
                <ul className="space-y-1 text-sm">
                  <li>• {t('privacy.legalComp1')}</li>
                  <li>• {t('privacy.legalComp2')}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.informationSharing')}</h2>
          <div className="space-y-4">
            <p>{t('privacy.sharingText1')}</p>
            <p>{t('privacy.sharingText2')}</p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>{t('privacy.serviceProviders')}</strong></li>
              <li>• <strong>{t('privacy.paymentProcessors')}</strong></li>
              <li>• <strong>{t('privacy.shippingPartners')}</strong></li>
              <li>• <strong>{t('privacy.legalObligations')}</strong></li>
            </ul>
            <p>{t('privacy.sharingText3')}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.dataSecurity')}</h2>
          <div className="space-y-4">
            <p>{t('privacy.securityText1')}</p>
            <ul className="space-y-1 ml-4">
              <li>• {t('privacy.security1')}</li>
              <li>• {t('privacy.security2')}</li>
              <li>• {t('privacy.security3')}</li>
            </ul>
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-sm">
                {t('privacy.securityText2')}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.cookiesTracking')}</h2>
          <div className="space-y-4">
            <p>{t('privacy.cookiesText1')}</p>
            <p>{t('privacy.cookiesText2')}</p>
            <ul className="space-y-1 ml-4">
              <li>• {t('privacy.cookies1')}</li>
              <li>• {t('privacy.cookies2')}</li>
            </ul>
            <p>{t('privacy.cookiesText3')}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.yourRights')}</h2>
          <div className="space-y-4">
            <p>{t('privacy.rightsText1')}</p>
            <ul className="space-y-1 ml-4">
              <li>• {t('privacy.rights1')}</li>
              <li>• {t('privacy.rights2')}</li>
              <li>• {t('privacy.rights3')}</li>
            </ul>
            <p>
              {t('privacy.rightsText2', { email }).split(email)[0]}
              <a href={`mailto:${email}`} className="text-primary underline hover:text-primaryHover">
                {email}
              </a>.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.dataRetention')}</h2>
          <p>
            {t('privacy.retentionText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.childrensPrivacy')}</h2>
          <p>
            {t('privacy.childrenText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.changesToPolicy')}</h2>
          <p>
            {t('privacy.changesText')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">{t('privacy.contactUs')}</h2>
          <p>
            {t('privacy.contactText1')}
          </p>
          <div className="bg-surface border border-border rounded-lg p-4 mt-4">
            <p>
              <strong>{t('privacy.email')}</strong>{' '}
              <a href={`mailto:${email}`} className="text-primary underline hover:text-primaryHover">
                {email}
              </a>
            </p>
            <p className="mt-2">
              <strong>{t('privacy.subjectLine')}</strong>
            </p>
            <p className="mt-2">
              <strong>{t('privacy.privacyLastUpdated')}</strong>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
