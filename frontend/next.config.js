/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/uploads/:path*',
          destination: 'http://localhost:3001/uploads/:path*', // Proxy to local Backend for uploads
        },
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*', // Proxy to local Backend for API
        },
      ];
    } else {
      return [
        {
          source: '/uploads/:path*',
          destination: '/uploads/:path*', // Use Vercel's routing in production for uploads
        },
        {
          source: '/api/:path*',
          destination: '/api/:path*', // Use Vercel's routing in production for API
        },
      ];
    }
  },
  images: {
    loader: 'custom',
    loaderFile: './src/utils/imageLoader.js',
  },
};

module.exports = nextConfig;