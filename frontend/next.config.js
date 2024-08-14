/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*', // Proxy to local Backend
        },
      ];
    } else {
      return [
        {
          source: '/api/:path*',
          destination: '/api/:path*', // Use Vercel's routing in production
        },
      ];
    }
  },
};

module.exports = nextConfig;