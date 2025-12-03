import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'About LatamTCG | Safe and Reliable Buying',
    description: 'Learn about LatamTCG: your trusted platform for buying Magic cards in Chile. Every card, always. With complete confidence.',
    alternates: {
      canonical: 'https://latamtcg.com/en/about',
    },
  };
}

export default async function AboutPage() {
  setRequestLocale('en');
  
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-6">About LatamTCG</h1>
      
      <div className="space-y-6 text-base md:text-lg" style={{ color: 'var(--mutedText)' }}>
        <p>
          <strong style={{ color: 'var(--text)' }}>Every card, always. With complete confidence.</strong> At LatamTCG, 
          we believe buying Magic: The Gathering cards should be simple, safe, and reliable. We are a professional 
          platform that connects players and collectors in Chile with the global card market, guaranteeing 
          authenticity, quality, and transparency in every transaction.
        </p>
        
        <p>
          Our mission is to eliminate common concerns when buying cards: informal sellers, counterfeit products, 
          misdescribed conditions, and surprises upon delivery. At LatamTCG, every card is verified, every price 
          is transparent, and every delivery is protected. You always receive exactly what you ordered.
        </p>
        
        <p>
          We operate from Providencia, Santiago, and are committed to building a trusted community for Magic: 
          The Gathering enthusiasts in Chile. If you have questions or need help, 
          <Link href="/en/contact" className="underline hover:opacity-80 ml-1" style={{ color: '#9B7BFF' }}>contact us</Link> or 
          <Link href="/en/how-it-works" className="underline hover:opacity-80 ml-1" style={{ color: '#9B7BFF' }}>learn how our process works</Link>.
        </p>
      </div>
      
      <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text)' }}>Useful Links</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/en" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Home</Link>
          </li>
          <li>
            <Link href="/en/how-it-works" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>How it works</Link>
          </li>
          <li>
            <Link href="/mtg/search" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Search cards</Link>
          </li>
          <li>
            <Link href="/en/contact" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Contact</Link>
          </li>
        </ul>
      </div>
    </main>
  );
}

