import type { NextConfig } from "next";

const host = process.env.SCRYFALL_IMAGE_HOST || 'cards.scryfall.io'
const errorHost = process.env.SCRYFALL_ERROR_IMAGE_HOST || 'errors.scryfall.com'
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: host,
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
};

export default nextConfig;
