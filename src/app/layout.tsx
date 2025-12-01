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
    default: 'LatamTCG - Mercado confiable de Magic: The Gathering en Latinoamérica',
    template: '%s | LatamTCG',
  },
  description: 'Compra y vende cartas auténticas de Magic: The Gathering en LatamTCG. Calidad garantizada (LP o mejor), precios justos y entrega confiable en Chile. El mercado más confiable de TCG en Latinoamérica.',
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
    title: 'LatamTCG - Mercado confiable de Magic: The Gathering en Latinoamérica',
    description: 'Compra y vende cartas auténticas de Magic: The Gathering en LatamTCG. Calidad garantizada (LP o mejor), precios justos y entrega confiable en Chile.',
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
    title: 'LatamTCG - Mercado confiable de Magic: The Gathering en Latinoamérica',
    description: 'Compra y vende cartas auténticas de Magic: The Gathering. Calidad garantizada, precios justos y entrega confiable.',
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
            <header className="py-4">
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
                  {/* Row 1: Menu + Title + Cart + User */}
                  <div className="flex items-center justify-between mb-3">
                    <LeftCatalogMenu />
                    <div className="text-2xl font-bold whitespace-nowrap" style={{ letterSpacing: '-0.01em' }}>
                      <Link href="/" aria-label="LatamTCG - Inicio">LatamTCG</Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <HeaderCart />
                      <HeaderUser />
                    </div>
                  </div>
                  
                  {/* Row 2: Search */}
                  <div className="w-full">
                    <SearchBox />
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
