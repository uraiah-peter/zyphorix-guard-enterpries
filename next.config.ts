import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Enable standalone output for Docker
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  // Optimized image handling
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // User-supplied organization logo URLs can point to any HTTPS host.
      { protocol: 'https', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers (also applied in middleware, but belt+suspenders)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Turbopack config (Next.js 16 default)
  turbopack: {},

  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') ?? '',
      ].filter(Boolean),
    },
  },

  // Logging
  logging: {
    fetches: { fullUrl: process.env.NODE_ENV === 'development' },
  },
};

export default nextConfig;
