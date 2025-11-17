import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('contact.title')} | LatamTCG`,
    description: t('contact.description'),
  };
}

export default async function ContactPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">{t('contact.title')}</h1>
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
