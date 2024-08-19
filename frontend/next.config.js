/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:3001';
    
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/uploads/:path*',
          destination: `${backendUrl}/uploads/:path*`, // Proxy to Backend for uploads
        },
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`, // Proxy to Backend for API
        },
      ];
    } else {
      // For staging and production
      return [
        {
          source: '/uploads/:path*',
          destination: '/uploads/:path*', // Use container's routing for uploads
        },
        {
          source: '/api/:path*',
          destination: '/api/:path*', // Use container's routing for API
        },
      ];
    }
  },
  images: {
    loader: 'custom',
    loaderFile: './src/utils/imageLoader.js',
  },
  // Add this to make environment variables available to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  },
};

module.exports = nextConfig;