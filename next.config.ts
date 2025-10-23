import type { NextConfig } from "next";

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
  eslint: {
    // Skip ESLint during production builds to avoid blocking on unrelated pre-existing errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
