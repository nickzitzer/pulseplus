// TODO: Add TypeScript definitions for MDX components
declare module '*.mdx' {
  import { ComponentType } from 'react'
  const Component: ComponentType
  export default Component
}

declare module '@mdx-js/react' {
  interface MDXComponents {
    VersionHistory: typeof import('../components/VersionHistory').VersionHistory
    ErrorExample: typeof import('../components/ErrorExample').ErrorExample
  }
} 