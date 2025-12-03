import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import SearchBox from "@/components/SearchBox";
import SafeClient from "@/components/SafeClient";
import Link from "next/link";
import HeaderUser from "@/components/HeaderUser";
import HeaderCart from "@/components/HeaderCart";
import { CartProvider } from "@/components/CartProvider";
import { PricingProvider } from "@/components/PricingProvider";
import { LoadingProvider } from "@/components/ui/LoadingProvider";
import GlobalProgress from "@/components/ui/GlobalProgress";
import Footer from "@/components/Footer";
import { LeftCatalogMenu } from "@/components/nav/LeftCatalogMenu";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://latamtcg.com"),
  title: {
    default: 'Comprar Cartas de Magic en Chile | Todas las cartas, siempre',
    template: '%s | LatamTCG',
  },
  description: 'Encuentra cartas de Magic The Gathering y compra con total confianza. Plataforma profesional, segura y sin vendedores informales. Recibe siempre lo que pediste.',
  keywords: ['Magic The Gathering', 'MTG', 'cartas Magic', 'TCG', 'Latinoamérica', 'Chile', 'cartas coleccionables', 'Magic cards', 'LatamTCG'],
  authors: [{ name: 'LatamTCG' }],
  creator: 'LatamTCG',
  publisher: 'LatamTCG',
  alternates: {
    canonical: "https://latamtcg.com",
  },
  openGraph: {
    type: 'website',
    locale: 'es',
    url: 'https://latamtcg.com',
    siteName: 'LatamTCG',
    title: 'Comprar Cartas de Magic en Chile | Todas las cartas, siempre',
    description: 'Encuentra cartas de Magic The Gathering y compra con total confianza. Plataforma profesional, segura y sin vendedores informales. Recibe siempre lo que pediste.',
    images: [
      {
        url: 'https://latamtcg.com/web-app-manifest-512x512.png',
        width: 512,
        height: 512,
        alt: 'LatamTCG - Mercado confiable de Magic: The Gathering',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comprar Cartas de Magic en Chile | Todas las cartas, siempre',
    description: 'Encuentra cartas de Magic The Gathering y compra con total confianza. Plataforma profesional, segura y sin vendedores informales.',
    images: ['https://latamtcg.com/web-app-manifest-512x512.png'],
    // Add Twitter handles when available:
    // creator: '@latamtcg',
    // site: '@latamtcg',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add Google Search Console verification when available
    // google: 'your-verification-code',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get locale and messages for next-intl
  // For MVP, we default to 'es' but structure supports future 'en' locale
  const locale = await getLocale();
  const messages = await getMessages();
  
  return (
    <html lang={locale} suppressHydrationWarning className="text-fg">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-bg [background:var(--bg-grad)]`}
      >
        {/* Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://latamtcg.com/#organization',
                  name: 'LatamTCG',
                  url: 'https://latamtcg.com',
                  logo: 'https://latamtcg.com/web-app-manifest-512x512.png',
                  contactPoint: {
                    '@type': 'ContactPoint',
                    email: 'hola@latamtcg.com',
                    contactType: 'Customer Service',
                    areaServed: 'CL',
                    availableLanguage: ['es', 'en'],
                  },
                  sameAs: [],
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://latamtcg.com/#website',
                  url: 'https://latamtcg.com',
                  name: 'LatamTCG',
                  description: 'Todas las cartas, siempre. Con total confianza. Buy Magic: The Gathering cards with complete confidence.',
                  publisher: {
                    '@id': 'https://latamtcg.com/#organization',
                  },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: 'https://latamtcg.com/mtg/search?q={search_term_string}',
                    },
                    'query-input': 'required name=search_term_string',
                  },
                  inLanguage: ['es', 'en'],
                },
              ],
            }),
          }}
        />
        {/* Defer analytics and non-critical scripts */}
        <Script id="analytics" strategy="lazyOnload">
          {`/* placeholder for analytics init */`}
        </Script>
        {/* Global providers and client-only sections */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SafeClient>
            <LoadingProvider>
              <GlobalProgress />
              <PricingProvider>
                <CartProvider>
            {/* Global search section */}
            <header className="py-2 md:py-4">
              <div className="px-4">
                {/* Desktop layout */}
                <div className="hidden md:flex items-center gap-4">
                  <LeftCatalogMenu />
                  <div className="text-2xl font-bold whitespace-nowrap" style={{ letterSpacing: '-0.01em' }}>
                    <Link href="/" aria-label="LatamTCG - Inicio">LatamTCG</Link>
                  </div>
                  <div className="flex-1">
                    <div className="w-full">
                      <SearchBox />
                    </div>
                  </div>
                  <HeaderCart />
                  <HeaderUser />
                </div>
                
                {/* Mobile layout */}
                <div className="md:hidden">
                  {/* Row 1: Title + Cart + User */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xl font-bold whitespace-nowrap" style={{ letterSpacing: '-0.01em' }}>
                      <Link href="/" aria-label="LatamTCG - Inicio">LatamTCG</Link>
                    </div>
                    <div className="flex items-center gap-1">
                      <HeaderCart />
                      <HeaderUser />
                    </div>
                  </div>
                  
                  {/* Row 2: Hamburger + Search */}
                  <div className="flex items-center gap-2 mt-2">
                    <LeftCatalogMenu />
                    <div className="flex-1 min-w-0">
                      <SearchBox />
                    </div>
                  </div>
                </div>
              </div>
            </header>
            <div style={{ borderTop: '1px solid var(--divider)' }} />
            <main className="px-4">
              {children}
            </main>
            <Footer />
                </CartProvider>
              </PricingProvider>
            </LoadingProvider>
          </SafeClient>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
