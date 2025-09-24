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
};

export default nextConfig;
