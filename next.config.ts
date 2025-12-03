import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const host = process.env.SCRYFALL_IMAGE_HOST || 'cards.scryfall.io'
const errorHost = process.env.SCRYFALL_ERROR_IMAGE_HOST || 'errors.scryfall.com'
const nextConfig: NextConfig = {
  images: {
    // Feature flag to disable Next.js image optimization during testing
    // Set NEXT_IMAGE_UNOPTIMIZED=true to bypass Vercel Image Transformations
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === 'true',
    // Reduced deviceSizes and imageSizes to limit generated variants and reduce transformation costs
    deviceSizes: [640, 768, 1024],
    imageSizes: [16, 32, 64, 128],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: host,
      },
      // Always allow the canonical Scryfall cards host, even if an env override is set
      {
        protocol: 'https',
        hostname: 'cards.scryfall.io',
      },
      {
        protocol: 'https',
        hostname: errorHost,
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/mtg/printing/:set/:slug',
        destination: '/mtg/printing/:slug',
        permanent: true,
      },
    ]
  },
  // Allow redirects from Flow payment gateway
  // Note: eslint config removed in Next.js 16 - configure via eslint.config.mjs instead
  experimental: {
    serverActions: {
      allowedOrigins: process.env.NODE_ENV === 'development' 
        ? ['olinda-unstuccoed-unfaithfully.ngrok-free.dev', 'www.flow.cl', 'localhost:3000']
        : ['www.flow.cl', 'flow.cl'],
    },
  },
};

export default withNextIntl(nextConfig);
