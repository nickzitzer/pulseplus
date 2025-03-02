/**
 * Image loader utility for optimizing and loading images from the PulsePlus API
 */

export interface ImageLoaderOptions {
  /**
   * Image source path (relative to backend)
   */
  src?: string;
  
  /**
   * Desired image width in pixels
   */
  width?: number;
  
  /**
   * Image quality (1-100)
   */
  quality?: number;
  
  /**
   * Image format (optional)
   */
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  
  /**
   * Whether to apply blur effect
   */
  blur?: number;
  
  /**
   * Type of image (avatar, game, achievement, etc.)
   */
  type?: 'avatar' | 'game' | 'achievement' | 'item' | 'banner' | 'icon';
}

/**
 * Default image loader options
 */
const defaultOptions: Required<Omit<ImageLoaderOptions, 'type'>> = {
  src: '/missing-image.png',
  width: 0, // 0 means original size
  quality: 75,
  format: 'webp',
  blur: 0,
};

/**
 * Default fallback images by type
 */
const defaultImages = {
  avatar: '/images/default-avatar.png',
  game: '/images/default-game.png',
  achievement: '/images/default-achievement.png',
  item: '/images/default-item.png',
  banner: '/images/default-banner.png',
  icon: '/images/default-icon.png',
};

/**
 * Generate optimized image URL with transformation parameters
 * @param options - Image loader options
 * @returns Optimized image URL
 */
export default function imageLoader(options: ImageLoaderOptions = {}): string {
  const { src, width, quality, format, blur, type } = { 
    ...defaultOptions, 
    ...options 
  };
  
  // Use type-specific default if src is not provided
  const imageSrc = src || (type ? defaultImages[type] : defaultOptions.src);
  
  const baseUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.NEXT_PUBLIC_BACKEND_PORT}` || '';
  
  // Start building the URL with the source path
  let imageUrl = `${baseUrl}${imageSrc}`;
  
  // Add query parameters for transformations
  const params = new URLSearchParams();
  
  if (width > 0) {
    params.append('w', width.toString());
  }
  
  if (quality !== defaultOptions.quality) {
    params.append('q', quality.toString());
  }
  
  if (format !== defaultOptions.format) {
    params.append('fm', format);
  }
  
  if (blur > 0) {
    params.append('blur', blur.toString());
  }
  
  // Add query parameters if any exist
  const queryString = params.toString();
  if (queryString) {
    imageUrl += `?${queryString}`;
  }
  
  return imageUrl;
}

/**
 * Generate a responsive image srcset
 * @param src - Image source path
 * @param widths - Array of widths to generate
 * @param options - Additional image options
 * @returns srcset string for responsive images
 */
export function generateSrcSet(
  src: string,
  widths: number[] = [640, 750, 828, 1080, 1200, 1920],
  options: Omit<ImageLoaderOptions, 'src' | 'width'> = {}
): string {
  return widths
    .map(width => {
      const url = imageLoader({ src, width, ...options });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Get appropriate sizes attribute for responsive images
 * @param sizes - Custom sizes attribute or breakpoints
 * @returns sizes attribute string
 */
export function getSizes(
  sizes: string | { sm?: string; md?: string; lg?: string; xl?: string } = '100vw'
): string {
  if (typeof sizes === 'string') {
    return sizes;
  }
  
  const { sm, md, lg, xl } = sizes;
  const sizesArray = [];
  
  if (xl) sizesArray.push(`(min-width: 1280px) ${xl}`);
  if (lg) sizesArray.push(`(min-width: 1024px) ${lg}`);
  if (md) sizesArray.push(`(min-width: 768px) ${md}`);
  if (sm) sizesArray.push(`(min-width: 640px) ${sm}`);
  
  sizesArray.push('100vw'); // Default size
  
  return sizesArray.join(', ');
}

/**
 * Get avatar image URL for a user
 * @param userId - User ID
 * @param size - Avatar size in pixels
 * @returns Avatar image URL
 */
export function getAvatarUrl(userId: string, size: number = 48): string {
  return imageLoader({
    src: `/users/${userId}/avatar`,
    width: size,
    type: 'avatar',
  });
}

/**
 * Get game image URL
 * @param gameId - Game ID
 * @param width - Image width
 * @returns Game image URL
 */
export function getGameImageUrl(gameId: string, width: number = 300): string {
  return imageLoader({
    src: `/games/${gameId}/image`,
    width,
    type: 'game',
  });
}

/**
 * Get achievement icon URL
 * @param achievementId - Achievement ID
 * @param size - Icon size
 * @returns Achievement icon URL
 */
export function getAchievementIconUrl(achievementId: string, size: number = 64): string {
  return imageLoader({
    src: `/achievements/${achievementId}/icon`,
    width: size,
    type: 'achievement',
  });
} 