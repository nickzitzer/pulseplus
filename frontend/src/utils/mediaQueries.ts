/**
 * Standardized breakpoints and responsive utilities
 */

import { useEffect, useState } from 'react';

// Breakpoint sizes in pixels
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export type Breakpoint = keyof typeof breakpoints;

// Media query strings for CSS-in-JS libraries
export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  '2xl': `@media (min-width: ${breakpoints['2xl']}px)`,
  
  // Max-width queries (for mobile-first design)
  xsMax: `@media (max-width: ${breakpoints.sm - 1}px)`,
  smMax: `@media (max-width: ${breakpoints.md - 1}px)`,
  mdMax: `@media (max-width: ${breakpoints.lg - 1}px)`,
  lgMax: `@media (max-width: ${breakpoints.xl - 1}px)`,
  xlMax: `@media (max-width: ${breakpoints['2xl'] - 1}px)`,
  
  // Range queries
  xsOnly: `@media (max-width: ${breakpoints.sm - 1}px)`,
  smOnly: `@media (min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  mdOnly: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  lgOnly: `@media (min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  xlOnly: `@media (min-width: ${breakpoints.xl}px) and (max-width: ${breakpoints['2xl'] - 1}px)`,
  '2xlOnly': `@media (min-width: ${breakpoints['2xl']}px)`,
  
  // Orientation
  portrait: '@media (orientation: portrait)',
  landscape: '@media (orientation: landscape)',
  
  // Device features
  hover: '@media (hover: hover)',
  touchDevice: '@media (hover: none) and (pointer: coarse)',
  highDPI: '@media (min-resolution: 2dppx)',
  
  // Dark mode
  darkMode: '@media (prefers-color-scheme: dark)',
  lightMode: '@media (prefers-color-scheme: light)',
  
  // Reduced motion
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
};

/**
 * Hook to check if a media query matches
 * @param query - Media query string
 * @returns Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);
  
  useEffect(() => {
    // Create media query list and check initial match
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);
    
    // Define callback for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add listener for changes
    mediaQueryList.addEventListener('change', handleChange);
    
    // Clean up
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);
  
  return matches;
}

/**
 * Hook to get the current breakpoint
 * @returns Current breakpoint name
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width >= breakpoints['2xl']) {
        setBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setBreakpoint('sm');
      } else {
        setBreakpoint('xs');
      }
    };
    
    // Set initial breakpoint
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return breakpoint;
}

/**
 * Hook to check if the current breakpoint is at least the specified size
 * @param size - Breakpoint to check
 * @returns Whether the current breakpoint is at least the specified size
 */
export function useBreakpointAtLeast(size: Breakpoint): boolean {
  const currentBreakpoint = useBreakpoint();
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const targetIndex = breakpointOrder.indexOf(size);
  
  return currentIndex >= targetIndex;
}

/**
 * Hook to check if the current breakpoint is at most the specified size
 * @param size - Breakpoint to check
 * @returns Whether the current breakpoint is at most the specified size
 */
export function useBreakpointAtMost(size: Breakpoint): boolean {
  const currentBreakpoint = useBreakpoint();
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const targetIndex = breakpointOrder.indexOf(size);
  
  return currentIndex <= targetIndex;
}

/**
 * Hook to check if the device is mobile
 * @returns Whether the device is mobile
 */
export function useMobileDevice(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}

/**
 * Hook to check if the user prefers dark mode
 * @returns Whether the user prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Hook to check if the user prefers reduced motion
 * @returns Whether the user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Get a responsive value based on the current breakpoint
 * @param values - Object with values for different breakpoints
 * @param defaultValue - Default value if no breakpoint matches
 * @returns The value for the current breakpoint
 */
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue?: T
): T | undefined {
  const currentBreakpoint = useBreakpoint();
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  
  // Find the closest defined breakpoint
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  
  // Look for the closest defined breakpoint (current or lower)
  for (let i = currentIndex; i >= 0; i--) {
    const breakpoint = breakpointOrder[i];
    if (values[breakpoint] !== undefined) {
      return values[breakpoint];
    }
  }
  
  return defaultValue;
}

export default {
  breakpoints,
  mediaQueries,
  useMediaQuery,
  useBreakpoint,
  useBreakpointAtLeast,
  useBreakpointAtMost,
  useMobileDevice,
  usePrefersDarkMode,
  usePrefersReducedMotion,
  useResponsiveValue,
}; 