import Link from 'next/link';
import pkg from '../../package.json';
import { getTranslations } from 'next-intl/server';

export default async function Footer() {
  const t = await getTranslations();
  const currentYear = new Date().getFullYear();
  
  // Use version from package.json which is always available
  const version = pkg.version;

  return (
    <footer className="mt-16 bg-brand-900 text-gray-100 border-t border-brand-800">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:divide-x lg:divide-brand-800">
          {/* Shop */}
          <nav aria-label={t('footer.shop')} className="lg:px-6 lg:pl-0">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white mb-4">{t('footer.shop')}</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/mtg/search" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  {t('footer.magicTheGathering')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/mtg/search" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  {t('footer.viewAllProducts')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Support */}
          <nav aria-label={t('footer.support')} className="lg:px-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white mb-4">{t('footer.support')}</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/contact" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  {t('footer.contactUs')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/help" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  {t('footer.faq')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/returns" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  {t('footer.refundsReturns')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* About LatamTCG */}
          <nav aria-label={t('footer.aboutLatamtcg')} className="lg:px-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white mb-4">{t('footer.aboutLatamtcg')}</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/about" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/how-it-works" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  {t('footer.howItWorks')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  {t('footer.termsConditions')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom section */}
        <div className="mt-10 border-t border-brand-800 pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-xs text-gray-300">
              <p>{t('footer.copyright', { year: currentYear })}</p>
              <p className="mt-1">{t('footer.version', { version })}</p>
            </div>
            <div className="text-xs text-gray-300">
              <p>
                {t('footer.trademark')}
                <br />
                {t('footer.notAffiliated')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
