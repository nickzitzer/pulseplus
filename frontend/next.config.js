/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/uploads/:path*',
          destination: 'http://backend:3001/uploads/:path*', // Proxy to Backend container for uploads
        },
        {
          source: '/api/:path*',
          destination: 'http://backend:3001/api/:path*', // Proxy to Backend container for API
        },
      ];
    } else {
      return [
        {
          source: '/uploads/:path*',
          destination: '/uploads/:path*', // Use container's routing in production for uploads
        },
        {
          source: '/api/:path*',
          destination: '/api/:path*', // Use container's routing in production for API
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