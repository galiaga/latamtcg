import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Script from "next/script";
import pkg from '../../package.json'
import SearchBox from "@/components/SearchBox";
import Link from "next/link";

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              var saved = localStorage.getItem('theme');
              var theme = saved === 'light' || saved === 'dark' ? saved : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
              var d = document.documentElement;
              d.setAttribute('data-theme', theme);
              d.style.colorScheme = theme;
            } catch (e) {}
          `}
        </Script>
        {/* Global search section */}
        <header className="py-4">
          <div className="px-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold whitespace-nowrap" style={{ letterSpacing: '-0.01em' }}>
                <Link href="/">LatamTCG</Link>
              </h1>
              <div className="flex-1">
                <div className="w-full">
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
        <footer className="mt-10 px-4 py-6">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--mutedText)' }}>
            <span aria-label={`App version ${pkg.version}`}>v{pkg.version}</span>
            <ThemeToggle />
          </div>
        </footer>
      </body>
    </html>
  );
}
