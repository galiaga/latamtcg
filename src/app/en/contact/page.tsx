import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Contact Us | LatamTCG',
    description: 'Need help? Contact us at LatamTCG. We respond within 24 hours to all your inquiries about Magic cards.',
    alternates: {
      canonical: 'https://latamtcg.com/en/contact',
    },
  };
}

export default async function ContactPage() {
  setRequestLocale('en');
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-6">{t('contact.title')}</h1>
      <div className="mt-6 space-y-6 text-mutedText">
        <p>
          {t('contact.description')}
        </p>
        
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-text">{t('contact.getInTouch')}</h2>
          <p>
            {t('contact.emailUs')}{' '}
            <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
              hola@latamtcg.com
            </a>
            {' '}{t('contact.getBackWithin24')}
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-text">{t('contact.commonQuestions')}</h2>
          <ul className="space-y-2">
            <li>• {t('contact.orderStatusShipping')}</li>
            <li>• {t('contact.cardConditionAuthenticity')}</li>
            <li>• {t('contact.bulkOrderRequests')}</li>
            <li>• {t('contact.technicalSupport')}</li>
            <li>• {t('contact.partnershipOpportunities')}</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-text">{t('contact.businessHours')}</h2>
          <p>{t('contact.mondayFriday')}</p>
          <p>{t('contact.saturday')}</p>
          <p>{t('contact.sunday')}</p>
        </div>
      </div>
    </main>
  );
}

