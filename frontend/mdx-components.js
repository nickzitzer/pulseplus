import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs' // nextra-theme-blog or your custom theme
import { VersionHistory } from '@/mdx-components/VersionHistory' // TODO: Create this component

// Get the default MDX components
const themeComponents = getThemeComponents()
 
// Merge components
export function useMDXComponents(components) {
  return {
    ...themeComponents,
    VersionHistory,
    // TODO: Add more custom components
    ...components
  }
}