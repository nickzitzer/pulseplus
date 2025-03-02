/**
 * Animation utilities for achievements, rewards, and UI elements
 */

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: string;
  iterations?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fill?: 'none' | 'forwards' | 'backwards' | 'both';
}

export interface AnimationKeyframes {
  [key: string]: Record<string, string | number>;
}

/**
 * Default animation configuration
 */
export const defaultConfig: AnimationConfig = {
  duration: 300,
  delay: 0,
  easing: 'ease-in-out',
  iterations: 1,
  direction: 'normal',
  fill: 'forwards',
};

/**
 * Create a Web Animation API compatible keyframes object
 * @param keyframes - The keyframes object
 * @returns Array of keyframes for Web Animation API
 */
export function createKeyframes(keyframes: AnimationKeyframes): Keyframe[] {
  return Object.entries(keyframes).map(([offset, properties]) => ({
    offset: parseFloat(offset) / 100,
    ...properties,
  }));
}

/**
 * Create animation options from config
 * @param config - Animation configuration
 * @returns KeyframeAnimationOptions object
 */
export function createAnimationOptions(
  config: AnimationConfig = {}
): KeyframeAnimationOptions {
  const mergedConfig = { ...defaultConfig, ...config };
  return {
    duration: mergedConfig.duration,
    delay: mergedConfig.delay,
    easing: mergedConfig.easing,
    iterations: mergedConfig.iterations,
    direction: mergedConfig.direction,
    fill: mergedConfig.fill,
  };
}

/**
 * Animate an element using the Web Animation API
 * @param element - The element to animate
 * @param keyframes - Animation keyframes
 * @param config - Animation configuration
 * @returns Animation object
 */
export function animate(
  element: HTMLElement,
  keyframes: AnimationKeyframes,
  config: AnimationConfig = {}
): Animation {
  const animationKeyframes = createKeyframes(keyframes);
  const animationOptions = createAnimationOptions(config);
  return element.animate(animationKeyframes, animationOptions);
}

/**
 * Predefined animation: Fade in
 */
export const fadeIn = {
  keyframes: {
    '0': { opacity: 0 },
    '100': { opacity: 1 },
  },
  config: {
    duration: 500,
    easing: 'ease-in',
  },
};

/**
 * Predefined animation: Fade out
 */
export const fadeOut = {
  keyframes: {
    '0': { opacity: 1 },
    '100': { opacity: 0 },
  },
  config: {
    duration: 500,
    easing: 'ease-out',
  },
};

/**
 * Predefined animation: Slide in from right
 */
export const slideInRight = {
  keyframes: {
    '0': { transform: 'translateX(100%)' },
    '100': { transform: 'translateX(0)' },
  },
  config: {
    duration: 400,
    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  },
};

/**
 * Predefined animation: Slide out to right
 */
export const slideOutRight = {
  keyframes: {
    '0': { transform: 'translateX(0)' },
    '100': { transform: 'translateX(100%)' },
  },
  config: {
    duration: 400,
    easing: 'cubic-bezier(0.5, 0, 0.75, 0)',
  },
};

/**
 * Predefined animation: Pop in (scale)
 */
export const popIn = {
  keyframes: {
    '0': { transform: 'scale(0.8)', opacity: 0 },
    '70': { transform: 'scale(1.05)', opacity: 1 },
    '100': { transform: 'scale(1)', opacity: 1 },
  },
  config: {
    duration: 400,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
};

/**
 * Predefined animation: Achievement unlock
 */
export const achievementUnlock = {
  keyframes: {
    '0': { transform: 'scale(0.5) rotate(-10deg)', opacity: 0 },
    '50': { transform: 'scale(1.2) rotate(5deg)', opacity: 1 },
    '75': { transform: 'scale(0.9) rotate(0deg)', opacity: 1 },
    '100': { transform: 'scale(1) rotate(0deg)', opacity: 1 },
  },
  config: {
    duration: 800,
    easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};

/**
 * Predefined animation: Reward shine
 */
export const rewardShine = {
  keyframes: {
    '0': { backgroundPosition: '-100% 0' },
    '100': { backgroundPosition: '200% 0' },
  },
  config: {
    duration: 1500,
    iterations: Infinity,
  },
};

/**
 * Predefined animation: Pulse
 */
export const pulse = {
  keyframes: {
    '0': { transform: 'scale(1)' },
    '50': { transform: 'scale(1.05)' },
    '100': { transform: 'scale(1)' },
  },
  config: {
    duration: 1000,
    iterations: Infinity,
  },
};

/**
 * Predefined animation: Shake
 */
export const shake = {
  keyframes: {
    '0': { transform: 'translateX(0)' },
    '10': { transform: 'translateX(-5px)' },
    '30': { transform: 'translateX(5px)' },
    '50': { transform: 'translateX(-3px)' },
    '70': { transform: 'translateX(3px)' },
    '90': { transform: 'translateX(-1px)' },
    '100': { transform: 'translateX(0)' },
  },
  config: {
    duration: 500,
  },
};

export default {
  animate,
  createKeyframes,
  createAnimationOptions,
  fadeIn,
  fadeOut,
  slideInRight,
  slideOutRight,
  popIn,
  achievementUnlock,
  rewardShine,
  pulse,
  shake,
}; 