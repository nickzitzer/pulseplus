import withNextra from 'nextra'

// Updated Nextra configuration to match the expected format
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true
}

// Create a Nextra configuration that doesn't use the deprecated properties
const withNextraConfig = withNextra({
  // Remove theme and themeConfig properties that are causing validation errors
  // and use the documented Nextra configuration format
  defaultShowCopyCode: true,
  mdxOptions: {
    remarkPlugins: [],
    rehypePlugins: []
  }
})

export default withNextraConfig(nextConfig)