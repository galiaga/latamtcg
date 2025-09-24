import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Script from "next/script";
import pkg from '../../package.json'
import SearchBox from "@/components/SearchBox";

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
        <header className="pt-8 pb-6">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.01em' }}>LatamTCG</h1>
            <p className="mt-2" style={{ color: 'var(--mutedText)' }}>Find any printing, variant, or language.</p>
            <div className="mt-6 flex items-center justify-center">
              <div className="w-full" style={{ maxWidth: 600 }}>
                <SearchBox />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              {['Black Lotus','Lightning Bolt','Teferi\'s Protection','Sol Ring'].map((q) => (
                <a key={q} className="badge transition-soft hover-glow-purple" href={`/mtg/search?q=${encodeURIComponent(q)}`}>{q}</a>
              ))}
            </div>
          </div>
        </header>
        <div style={{ borderTop: '1px solid var(--divider)' }} />
        <main className="px-4">
          {children}
        </main>
        <footer className="mt-10 px-4 py-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-xs" style={{ color: 'var(--mutedText)' }}>
            <span aria-label={`App version ${pkg.version}`}>v{pkg.version}</span>
            <ThemeToggle />
          </div>
        </footer>
      </body>
    </html>
  );
}
