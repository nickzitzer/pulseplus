// TypeScript definitions for MDX components
import type { ComponentType, FC } from 'react';
import type { VersionHistory } from '../VersionHistory';
import type { ErrorExample } from '../ErrorExample';

declare module '*.mdx' {
  const Component: ComponentType;
  export default Component;
}

declare module '@mdx-js/react' {
  interface MDXComponents {
    VersionHistory: FC<Parameters<typeof VersionHistory>[0]>;
    ErrorExample: FC<Parameters<typeof ErrorExample>[0]>;
  }
} 