import withNextra from 'nextra'

export default withNextra({
  theme: 'nextra-theme-docs',
  themeConfig: '../documentation/nextra/theme.config.jsx',
  mdxOptions: {
    remarkPlugins: [],
    rehypePlugins: []
  }
})