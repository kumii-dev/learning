/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow embedding from the Kumii host platform
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Removed X-Frame-Options so the Kumii host can embed us in an iframe.
          // Content-Security-Policy frame-ancestors is set per-environment below.
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${process.env.KUMII_HOST_ORIGIN || 'http://localhost:3000'};`,
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Proxy API calls to the Express backend during development
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/api/:path*',
            destination: `http://localhost:${process.env.PORT || 3001}/api/:path*`,
          },
        ]
      : [];
  },
};

module.exports = nextConfig;
