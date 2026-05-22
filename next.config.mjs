import { createMDX } from 'fumadocs-mdx/next';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['192.168.0.83'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.preroll.io',
      },
      {
        protocol: 'https',
        hostname: 'dev.preroll.io',
      },
      {
        protocol: 'https',
        hostname: 'preroll.io',
      },
    ],
  },
  async redirects() {
    if (process.env.PREROLL_SELF_HOSTED === 'true') {
      return [
        {
          source: '/admin/:path*',
          destination: '/app',
          permanent: false,
        },
      ]
    }
    return []
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
