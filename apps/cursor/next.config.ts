import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    useCache: true,
    inlineCss: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/u/**'
      },
      {
        protocol: 'https',
        hostname: 'pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'midday.ai',
        port: '',
        pathname: '/**'
      }
    ]
  },
  logging: {
    fetches: {
      fullUrl: true
    }
  }
};

export default nextConfig;