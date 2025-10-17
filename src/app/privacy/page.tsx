import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | LatamTCG',
  description: 'Learn how LatamTCG collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-text">Privacy Policy</h1>
      <div className="mt-6 space-y-8 text-mutedText">
        
        <section>
          <h2 className="text-lg font-medium text-text mb-3">Introduction</h2>
          <p>
            At LatamTCG, your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you browse our website or make a purchase.<br />
            LatamTCG is currently based in Chile and serves customers within Chile. By using our website, you agree to the terms described below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Information We Collect</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text">Personal Information</h3>
              <p>We may collect personal information that you voluntarily provide when creating an account or making a purchase, such as:</p>
              <ul className="mt-2 space-y-1 ml-4">
                <li>• Name and contact details (email address, phone number)</li>
                <li>• Shipping and billing addresses</li>
                <li>• Payment information (processed securely through third-party providers)</li>
                <li>• Account credentials and preferences</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-text">Automatically Collected Information</h3>
              <p>When you visit our website, we may automatically collect:</p>
              <ul className="mt-2 space-y-1 ml-4">
                <li>• IP address and device information</li>
                <li>• Browser type and version</li>
                <li>• Pages visited and duration</li>
                <li>• Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">How We Use Your Information</h2>
          <div className="space-y-4">
            <p>We use your information to provide, improve, and secure our services:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="font-medium text-text mb-2">Service Provision</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Process and fulfill orders</li>
                  <li>• Ship products to your address</li>
                  <li>• Provide customer support</li>
                  <li>• Manage your account</li>
                </ul>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="font-medium text-text mb-2">Communication</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Send order confirmations and shipping updates</li>
                  <li>• Respond to your inquiries or requests</li>
                </ul>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="font-medium text-text mb-2">Website Operation</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Maintain website performance and security</li>
                  <li>• Improve usability and reliability</li>
                </ul>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="font-medium text-text mb-2">Legal Compliance</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Comply with applicable laws and tax requirements in Chile</li>
                  <li>• Prevent fraud or unauthorized activity</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Information Sharing</h2>
          <div className="space-y-4">
            <p>We do <strong>not</strong> sell or rent your personal information.</p>
            <p>We may share information only with trusted third parties for the following purposes:</p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>Service Providers:</strong> Partners who help operate our website or handle customer service</li>
              <li>• <strong>Payment Processors:</strong> To securely process your transactions</li>
              <li>• <strong>Shipping Partners:</strong> To deliver your orders</li>
              <li>• <strong>Legal Obligations:</strong> When required by law or to protect our rights</li>
            </ul>
            <p>All partners are required to handle your data responsibly and in accordance with applicable laws.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Data Security</h2>
          <div className="space-y-4">
            <p>We apply appropriate security measures to protect your personal information, including:</p>
            <ul className="space-y-1 ml-4">
              <li>• SSL encryption for data transmission</li>
              <li>• Secure servers and limited access controls</li>
              <li>• Regular monitoring to prevent unauthorized access</li>
            </ul>
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-sm">
                While we do our best to safeguard your data, no system is 100% secure. We cannot guarantee absolute protection against all threats.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Cookies and Tracking</h2>
          <div className="space-y-4">
            <p>We use cookies to enhance your browsing experience.</p>
            <p>Cookies help us:</p>
            <ul className="space-y-1 ml-4">
              <li>• Remember your preferences (like language or theme)</li>
              <li>• Improve website performance</li>
            </ul>
            <p>You can manage or disable cookies through your browser settings. Some parts of the site may not function properly without cookies.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Your Rights</h2>
          <div className="space-y-4">
            <p>As a user, you may request:</p>
            <ul className="space-y-1 ml-4">
              <li>• Access to your personal information</li>
              <li>• Correction of incorrect or outdated data</li>
              <li>• Deletion of your data (where legally permitted)</li>
            </ul>
            <p>
              To exercise your rights, please contact us at{' '}
              <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
                hola@latamtcg.com
              </a>.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Data Retention</h2>
          <p>
            We retain your information only for as long as needed to fulfill orders, meet legal obligations, or resolve disputes. Once no longer required, your data will be deleted or anonymized.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Children's Privacy</h2>
          <p>
            LatamTCG is not intended for children under 13 years old.<br />
            We do not knowingly collect information from minors. If such data is identified, it will be promptly deleted.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically.<br />
            Updates will be posted on this page with a revised "Last Updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-text mb-3">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or how your data is handled, contact us at:
          </p>
          <div className="bg-surface border border-border rounded-lg p-4 mt-4">
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:hola@latamtcg.com" className="text-primary underline hover:text-primaryHover">
                hola@latamtcg.com
              </a>
            </p>
            <p className="mt-2">
              <strong>Subject line:</strong> Privacy Policy Inquiry
            </p>
            <p className="mt-2">
              <strong>Last updated:</strong> October 16, 2025
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
