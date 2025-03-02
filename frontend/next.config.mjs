// Standard Next.js configuration without Nextra
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  
  // Transpile packages that need to be processed by Next.js
  transpilePackages: ['@uiw/react-markdown-preview', '@uiw/react-md-editor'],
  
  // Configure webpack to handle CSS imports from node_modules
  webpack: (config, { isServer }) => {
    // Allow importing CSS from node_modules
    const rules = config.module.rules
      .find((rule) => typeof rule.oneOf === 'object')
      .oneOf.filter((rule) => Array.isArray(rule.use));

    // Add the packages to the CSS loader
    rules.forEach((rule) => {
      if (rule.test?.test?.('.css')) {
        rule.include = undefined;
      }
    });

    return config;
  }
}

export default nextConfig