import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Script from "next/script";
import pkg from '../../package.json'
import SearchBox from "@/components/SearchBox";
import SafeClient from "@/components/SafeClient";
import Link from "next/link";
import HeaderUser from "@/components/HeaderUser";
import HeaderCart from "@/components/HeaderCart";
import { CartProvider } from "@/components/CartProvider";
import ProgressBar from "@/components/ProgressBar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'LatamTCG',
    template: 'LatamTCG | %s',
  },
  description: 'LatamTCG',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="text-fg">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-bg [background:var(--bg-grad)]`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              var saved = localStorage.getItem('theme');
              var theme = saved === 'light' || saved === 'dark' ? saved : 'light';
              var d = document.documentElement;
              d.setAttribute('data-theme', theme);
              d.style.colorScheme = theme;
            } catch (e) {}
          `}
        </Script>
        {/* Defer analytics and non-critical scripts */}
        <Script id="analytics" strategy="lazyOnload">
          {`/* placeholder for analytics init */`}
        </Script>
        {/* Global providers and client-only sections */}
        <SafeClient>
          <ProgressBar />
          <CartProvider>
            {/* Global search section */}
            <header className="py-4">
              <div className="px-4">
                {/* Desktop layout */}
                <div className="hidden md:flex items-center gap-4">
                  <h1 className="text-2xl font-bold whitespace-nowrap" style={{ letterSpacing: '-0.01em' }}>
                    <Link href="/">LatamTCG</Link>
                  </h1>
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
                  <div className="flex items-center justify-between mb-3">
                    <h1 className="text-2xl font-bold whitespace-nowrap" style={{ letterSpacing: '-0.01em' }}>
                      <Link href="/">LatamTCG</Link>
                    </h1>
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
        </SafeClient>
      </body>
    </html>
  );
}
