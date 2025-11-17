import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations()
  return {
    title: `${t('massEntry.title')} - LatamTCG`,
    description: t('massEntry.description'),
  }
}

export default async function MassEntryPage() {
  const t = await getTranslations()
  return (
    <div className="py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
            {t('massEntry.title')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('massEntry.subtitle')}
          </p>
        </div>

        <div
          className="rounded-xl border p-8 text-center"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-4">{t('massEntry.comingSoon')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('massEntry.description')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('massEntry.inTheMeantime')}{' '}
              <a
                href="/mtg/search"
                className="text-primary hover:underline"
              >
                {t('massEntry.searchPage')}
              </a>
              {' '}{t('massEntry.toFindAndAdd')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

