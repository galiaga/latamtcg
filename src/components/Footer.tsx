import Link from 'next/link';
import fs from 'fs';
import path from 'path';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  // Read version from VERSION file
  const versionPath = path.join(process.cwd(), 'VERSION');
  const version = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf8').trim() : '0.25.0';

  return (
    <footer className="mt-16 bg-brand-900 text-gray-100 border-t border-brand-800">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:divide-x lg:divide-brand-800">
          {/* Shop */}
          <nav aria-label="Shop" className="lg:px-6 lg:pl-0">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white mb-4">Shop</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/mtg/search" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  Magic: The Gathering
                </Link>
              </li>
              <li>
                <Link 
                  href="/mtg/search" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  View all products
                </Link>
              </li>
            </ul>
          </nav>

          {/* Support */}
          <nav aria-label="Support" className="lg:px-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/contact" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/help" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/returns" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  Refunds & Returns
                </Link>
              </li>
            </ul>
          </nav>

          {/* About LatamTCG */}
          <nav aria-label="About LatamTCG" className="lg:px-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white mb-4">About LatamTCG</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/about" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/how-it-works" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-sm text-gray-100 hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom section */}
        <div className="mt-10 border-t border-brand-800 pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-xs text-gray-300">
              <p>© {currentYear} LatamTCG. All rights reserved.</p>
              <p className="mt-1">Version {version}</p>
            </div>
            <div className="text-xs text-gray-300">
              <p>
                Magic: The Gathering™ is a trademark of Wizards of the Coast LLC.
                <br />
                LatamTCG is not affiliated with Wizards of the Coast.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
