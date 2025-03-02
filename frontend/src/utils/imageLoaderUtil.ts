/**
 * Simple image loader utility for components
 */

export interface ImageLoaderOptions {
  src?: string;
  width: number;
  quality?: number;
  type?: string;
}

/**
 * Basic image loader function that returns the source URL
 * This is a simplified version to fix import issues
 */
export default function imageLoader(options: ImageLoaderOptions): string {
  const { src, width, quality, type } = options;
  return src || '';
} 