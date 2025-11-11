import type { Locale } from './messages';

export function resolveLocale(input?: Locale): Locale {
  // TODAY default:
  return input ?? (process.env.DEFAULT_LOCALE as Locale) ?? 'en';
  // LATER switch default by setting DEFAULT_LOCALE=es
}

export function formatCLP(n: number, locale: Locale) {
  const loc = locale === 'es' ? 'es-CL' : 'en-US';
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso: string, locale: Locale) {
  const loc = locale === 'es' ? 'es-CL' : 'en-US';
  return new Intl.DateTimeFormat(loc, {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: locale === 'en',
  }).format(new Date(iso));
}

