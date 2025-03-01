import nextra from 'nextra'

// Configuration for Nextra 2.x
const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.mjs',
  defaultShowCopyCode: true,
  flexsearch: {
    codeblocks: true
  },
  staticImage: true,
  latex: true,
  navigation: {
    useTitle: true
  }
})

export default withNextra({
  reactStrictMode: true,
  // For static export
  output: 'export',
  // Set basePath to '/docs' to match your proxy configuration
  basePath: '/docs',
  trailingSlash: true, // Better static export compatibility
  images: {
    unoptimized: true, // Required for static export
  },
  // Fix for hydration mismatch
  experimental: {
    optimizeCss: true,
    scrollRestoration: true
  },
  // Ensure static assets are copied to the out directory with the correct path prefix
  assetPrefix: '/docs',
  // Note: rewrites and redirects are not compatible with 'export' output
  // They will be handled by the Nginx configuration instead
}) 