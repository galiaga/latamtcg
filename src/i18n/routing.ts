import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['es'],

  // Used when no locale matches
  defaultLocale: 'es',
  
  // Disable locale prefixes in URLs - keep routes as-is (no /es/ prefix)
  // This is perfect for MVP with single locale
  // When adding English later, you can change this to 'as-needed' or 'always'
  localePrefix: 'never'
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);

