'use client';

import { useState, useCallback } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (result.ok) {
        setSubmitStatus('success');
        setEmail('');
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting]);

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-white mb-2">Stay Updated</h4>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address for newsletter
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          aria-invalid={submitStatus === 'error'}
          className="flex-1 rounded-lg border border-brand-700 bg-brand-800 text-gray-100 placeholder-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? '...' : 'Subscribe'}
        </button>
      </form>
      {submitStatus === 'success' && (
        <p className="mt-2 text-sm text-green-400">Thanks for subscribing!</p>
      )}
      {submitStatus === 'error' && (
        <p className="mt-2 text-sm text-red-400">Please try again.</p>
      )}
    </div>
  );
}
