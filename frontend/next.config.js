/** @type {import('next').NextConfig} */
const removeImports = require("next-remove-imports")();

const nextConfig = {
  async rewrites() {
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.NEXT_PUBLIC_BACKEND_PORT}`|| `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT || 3001}`;
    
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
  },
  images: {
    loader: 'custom',
    loaderFile: './src/utils/imageLoader.js',
  },
  // Make environment variables available to the browser
  env: {
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_FRONTEND_PORT: process.env.NEXT_PUBLIC_FRONTEND_PORT,
    NEXT_PUBLIC_BACKEND_PORT: process.env.NEXT_PUBLIC_BACKEND_PORT,
  },
};

module.exports = removeImports(nextConfig);