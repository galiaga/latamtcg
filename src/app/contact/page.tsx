import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | LatamTCG',
  description: 'Get in touch with the LatamTCG team for support and inquiries.',
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">Contact Us</h1>
      <div className="mt-6 space-y-6 text-mutedText">
        <p>
          Need help or have questions? We're here to assist you with your Magic: The Gathering card needs.
        </p>
        
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-text">Get in Touch</h2>
          <p>
            Email us at{' '}
            <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
              hola@latamtcg.com
            </a>
            {' '}and we'll get back to you within 24 hours.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-text">Common Questions</h2>
          <ul className="space-y-2">
            <li>• Order status and shipping inquiries</li>
            <li>• Card condition and authenticity questions</li>
            <li>• Bulk order requests</li>
            <li>• Technical support for the website</li>
            <li>• Partnership opportunities</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-text">Business Hours</h2>
          <p>Monday - Friday: 9:00 AM - 6:00 PM (GMT-3)</p>
          <p>Saturday: 10:00 AM - 2:00 PM (GMT-3)</p>
          <p>Sunday: Closed</p>
        </div>
      </div>
    </main>
  );
}
