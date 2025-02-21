import withNextra from 'nextra'

export default withNextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
  mdxOptions: {
    remarkPlugins: [],
    rehypePlugins: []
  }
})