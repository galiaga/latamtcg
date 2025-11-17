# Internationalization (i18n) Implementation Summary

## Overview
This document summarizes the i18n implementation using next-intl for the LatamTCG application. The implementation is structured to support Spanish (es) as the default locale for MVP, with infrastructure ready for English (en) support in the future.

## Implementation Status

### ✅ Completed

1. **Package Installation**
   - Installed `next-intl` (latest version)

2. **Configuration Files Created**
   - `/src/i18n/routing.ts` - Defines locale routing configuration (currently only 'es')
   - `/src/i18n/request.ts` - Handles locale detection and message loading
   - `/messages/es.json` - Complete Spanish translations for all UI text

3. **Next.js Configuration**
   - Updated `next.config.ts` to include next-intl plugin
   - Updated `src/middleware.ts` to integrate next-intl middleware

4. **Root Layout**
   - Updated `src/app/layout.tsx` to:
     - Import and use `NextIntlClientProvider`
     - Load locale and messages server-side
     - Set HTML lang attribute dynamically

5. **Components Updated** (Partial - Core components done)
   - `HeaderUser.tsx` - Uses `useTranslations()` for client component
   - `HeaderCart.tsx` - Uses `useTranslations()` for client component
   - `SearchBox.tsx` - Uses `useTranslations()` for client component
   - `Footer.tsx` - Uses `getTranslations()` for server component

### 🔄 Remaining Work

The following components and pages still need to be updated to use translations:

#### Components
- `PopularCards.tsx`
- `RandomButton.tsx`
- `AddToCartButton.tsx`
- `SearchResultsGrid.tsx` (large component with many strings)
- `CardTile.tsx`
- `LeftCatalogMenu.tsx`
- Other UI components in `/src/components/`

#### Pages
- `src/app/page.tsx` (Home page)
- `src/app/about/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/returns/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/help/page.tsx`
- `src/app/how-it-works/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/orders/page.tsx`
- `src/app/auth/page.tsx`
- `src/app/mass-entry/page.tsx`
- `src/app/mtg/printing/[printingId]/page.tsx`
- Other page components

## Translation Key Structure

All translation keys follow the pattern: `"section.component.key": "Text"`

Example:
```json
{
  "common": {
    "appName": "LatamTCG",
    "search": "Buscar"
  },
  "header": {
    "signIn": "Iniciar sesión"
  }
}
```

## How to Add English Support Later

### Step 1: Update Routing Configuration
In `/src/i18n/routing.ts`, add 'en' to the locales array:
```typescript
export const routing = defineRouting({
  locales: ['es', 'en'],  // Add 'en' here
  defaultLocale: 'es'
});
```

### Step 2: Create English Messages File
Create `/messages/en.json` with English translations. You can use the same structure as `es.json`:
```json
{
  "common": {
    "appName": "LatamTCG",
    "search": "Search"
  },
  "header": {
    "signIn": "Sign in"
  }
  // ... etc
}
```

### Step 3: Update Middleware (if using locale-based routing)
If you want to use `/en/...` routes, update the middleware to handle locale prefixes. Currently, the app uses a single default locale without routing prefixes.

### Step 4: Add Language Selector (Optional)
Add a language selector component that allows users to switch between languages. Store the preference in cookies/localStorage and update the locale accordingly.

## Usage Patterns

### Client Components
```typescript
'use client'
import { useTranslations } from 'next-intl'

export default function MyComponent() {
  const t = useTranslations()
  return <div>{t('common.appName')}</div>
}
```

### Server Components
```typescript
import { getTranslations } from 'next-intl/server'

export default async function MyPage() {
  const t = await getTranslations()
  return <div>{t('common.appName')}</div>
}
```

### With Parameters
```typescript
// In messages/es.json:
// "footer.copyright": "© {year} LatamTCG. Todos los derechos reservados."

// In component:
t('footer.copyright', { year: 2025 })
```

## Files Modified

### New Files
- `/src/i18n/routing.ts`
- `/src/i18n/request.ts`
- `/messages/es.json`

### Modified Files
- `/next.config.ts` - Added next-intl plugin
- `/src/middleware.ts` - Integrated next-intl middleware
- `/src/app/layout.tsx` - Added NextIntlClientProvider
- `/src/components/HeaderUser.tsx` - Added translations
- `/src/components/HeaderCart.tsx` - Added translations
- `/src/components/SearchBox.tsx` - Added translations
- `/src/components/Footer.tsx` - Added translations

## Notes

1. **No Visual Changes**: All translations maintain the exact same UI appearance - only the text content changes.

2. **Default Locale**: The app defaults to Spanish ('es') for MVP. No language selector is implemented yet.

3. **No Locale Routing**: Currently, the app doesn't use `/en/...` or `/es/...` routes. All routes remain as-is. This can be added later when English support is needed.

4. **Type Safety**: next-intl provides TypeScript type safety for translation keys. Ensure your IDE recognizes the types from the messages files.

5. **Server vs Client**: 
   - Server components use `getTranslations()` from `'next-intl/server'`
   - Client components use `useTranslations()` from `'next-intl'`

## Testing

To verify the implementation:
1. Run the app and verify all text appears in Spanish
2. Check that no hardcoded English text remains in the updated components
3. Verify the app behavior is identical to before (no functional changes)

## Next Steps

1. Continue updating remaining components and pages to use translations
2. Test thoroughly to ensure all text is properly translated
3. When ready for English support, follow the steps outlined above

