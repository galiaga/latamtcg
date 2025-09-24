import type { NextConfig } from "next";

const host = process.env.SCRYFALL_IMAGE_HOST || 'cards.scryfall.io'
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: host,
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
