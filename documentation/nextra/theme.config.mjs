import { useConfig } from 'nextra-theme-docs'

export default {
  logo: <span style={{ fontWeight: 'bold' }}>PulsePlus Documentation</span>,
  project: {
    link: 'https://github.com/yourusername/pulseplus',
  },
  docsRepositoryBase: 'https://github.com/yourusername/pulseplus/tree/main/documentation',
  footer: {
    text: `© ${new Date().getFullYear()} Happy Technologies LLC. All rights reserved.`,
  },
  useNextSeoProps() {
    const { frontMatter } = useConfig()
    return {
      titleTemplate: frontMatter.title ? `%s – PulsePlus Docs` : 'PulsePlus Documentation',
      description: frontMatter.description || 'PulsePlus Documentation - Comprehensive guides and API references'
    }
  },
  head: () => {
    const { frontMatter } = useConfig()
    return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:title" content={frontMatter.title || 'PulsePlus Documentation'} />
        <meta property="og:description" content={frontMatter.description || 'PulsePlus Documentation - Comprehensive guides and API references'} />
      </>
    )
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
    titleComponent: ({ title, type, route }) => {
      if (typeof title === 'string') {
        title = title.replace(/\b\w/g, l => l.toUpperCase());
      }
      return <>{title}</>;
    }
  },
  toc: {
    float: true,
    title: 'On This Page',
  },
  primaryHue: {
    dark: 210,
    light: 210
  },
  navigation: {
    prev: true,
    next: true
  },
  feedback: {
    content: 'Question? Give us feedback →',
    labels: 'feedback',
  },
  search: {
    placeholder: 'Search documentation...',
  },
  navLinks: [
    { title: 'API Reference', href: '/docs/api-reference' },
    { title: 'Swagger UI', href: '/docs/swagger-ui/index.html', newWindow: true },
    { title: 'JSDoc', href: '/docs/jsdoc-static' },
  ],
  title: null,
  frontmatter: {
    layoutKey: 'layout',
    titleKey: 'title',
    descriptionKey: 'description',
  }
} 