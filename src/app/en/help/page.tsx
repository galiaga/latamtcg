import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Help Center | LatamTCG',
    description: 'Find answers to your questions about purchases, shipping, returns, and more at LatamTCG.',
    alternates: {
      canonical: 'https://latamtcg.com/en/help',
    },
  };
}

export default async function HelpPage() {
  setRequestLocale('en');
  
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-6">Help Center</h1>
      
      <div className="space-y-6 text-base md:text-lg" style={{ color: 'var(--mutedText)' }}>
        <p>
          <strong style={{ color: 'var(--text)' }}>Need help?</strong> We're here to answer all your 
          questions about buying Magic: The Gathering cards on LatamTCG. Find quick answers to the most 
          common questions or contact us directly if you need personalized assistance.
        </p>
        
        <p>
          Our process is designed to be simple and transparent. From searching for cards to receiving them 
          at your home, every step is designed to give you complete confidence. If something isn't clear 
          or you have a specific question, don't hesitate to <Link href="/en/contact" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>contact us</Link>.
        </p>
        
        <p>
          For detailed information about how our service works, including payment methods, shipping options, 
          and return policies, visit our <Link href="/en/how-it-works" className="underline hover:opacity-80 ml-1" style={{ color: '#9B7BFF' }}>how it works</Link> page.
        </p>
      </div>
      
      <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text)' }}>Useful Resources</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/en/how-it-works" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>How LatamTCG Works</Link>
          </li>
          <li>
            <Link href="/en/returns" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Return Policy</Link>
          </li>
          <li>
            <Link href="/en/contact" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Contact</Link>
          </li>
          <li>
            <Link href="/mtg/search" className="underline hover:opacity-80" style={{ color: '#9B7BFF' }}>Search cards</Link>
          </li>
        </ul>
      </div>
    </main>
  );
}

