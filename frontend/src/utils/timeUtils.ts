/**
 * Time-related utility functions
 */

/**
 * Format a duration in milliseconds to a human-readable string
 * @param ms - Duration in milliseconds
 * @param includeMs - Whether to include milliseconds in the output
 * @returns Formatted duration string (e.g., "2h 30m 15s")
 */
export function formatDuration(ms: number, includeMs: boolean = false): string {
  if (ms < 0) return '0s';
  
  const milliseconds = Math.floor(ms % 1000);
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  const parts = [];
  
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || (parts.length === 0 && !includeMs)) parts.push(`${seconds}s`);
  if (includeMs && milliseconds > 0) parts.push(`${milliseconds}ms`);
  
  return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * Format a countdown timer
 * @param ms - Remaining time in milliseconds
 * @param format - Format string ('hh:mm:ss' or 'mm:ss' or 'compact')
 * @returns Formatted countdown string
 */
export function formatCountdown(ms: number, format: 'hh:mm:ss' | 'mm:ss' | 'compact' = 'hh:mm:ss'): string {
  if (ms <= 0) return format === 'compact' ? '0s' : '00:00';
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  
  if (format === 'compact') {
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
  }
  
  const paddedSeconds = seconds.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  
  if (format === 'mm:ss') {
    return `${paddedMinutes}:${paddedSeconds}`;
  }
  
  const paddedHours = hours.toString().padStart(2, '0');
  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Calculate time elapsed since a given date
 * @param date - The past date to calculate elapsed time from
 * @returns Elapsed time in milliseconds
 */
export function getElapsedTime(date: Date | number | string): number {
  const pastTime = typeof date === 'object' ? date.getTime() : new Date(date).getTime();
  return Date.now() - pastTime;
}

/**
 * Format elapsed time as a human-readable string
 * @param date - The past date to calculate elapsed time from
 * @param shortFormat - Whether to use short format (e.g., "5m ago" vs "5 minutes ago")
 * @returns Human-readable elapsed time string
 */
export function formatElapsedTime(date: Date | number | string, shortFormat: boolean = false): string {
  const elapsed = getElapsedTime(date);
  
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (shortFormat) {
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  }
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Create a debounced function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * Create a throttled function
 * @param func - Function to throttle
 * @param limit - Throttle limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= limit) {
      lastCall = now;
      func(...args);
    } else if (timeout === null) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        func(...args);
      }, limit - timeSinceLastCall);
    }
  };
}

/**
 * Schedule a function to run at a specific time
 * @param func - Function to schedule
 * @param scheduledTime - Time to run the function
 * @returns Timeout ID
 */
export function scheduleAt(
  func: () => void,
  scheduledTime: Date | number
): NodeJS.Timeout {
  const targetTime = typeof scheduledTime === 'object'
    ? scheduledTime.getTime()
    : scheduledTime;
  
  const now = Date.now();
  const delay = Math.max(0, targetTime - now);
  
  return setTimeout(func, delay);
}

/**
 * Create a countdown timer
 * @param duration - Duration in milliseconds
 * @param onTick - Callback for each tick
 * @param onComplete - Callback when countdown completes
 * @param tickInterval - Interval between ticks in milliseconds
 * @returns Object with start, pause, resume, and stop methods
 */
export function createCountdown(
  duration: number,
  onTick: (remaining: number) => void,
  onComplete: () => void,
  tickInterval: number = 1000
) {
  let remaining = duration;
  let intervalId: NodeJS.Timeout | null = null;
  let lastTickTime = 0;
  let isPaused = false;
  
  const tick = () => {
    const now = Date.now();
    const elapsed = now - lastTickTime;
    lastTickTime = now;
    
    if (!isPaused) {
      remaining -= elapsed;
      
      if (remaining <= 0) {
        remaining = 0;
        stop();
        onTick(remaining);
        onComplete();
      } else {
        onTick(remaining);
      }
    }
  };
  
  const start = () => {
    if (intervalId !== null) return;
    
    isPaused = false;
    lastTickTime = Date.now();
    intervalId = setInterval(tick, tickInterval);
    onTick(remaining);
  };
  
  const pause = () => {
    isPaused = true;
  };
  
  const resume = () => {
    if (!isPaused) return;
    
    isPaused = false;
    lastTickTime = Date.now();
  };
  
  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
  
  const getRemainingTime = () => remaining;
  
  return {
    start,
    pause,
    resume,
    stop,
    getRemainingTime,
  };
}

export default {
  formatDuration,
  formatCountdown,
  getElapsedTime,
  formatElapsedTime,
  debounce,
  throttle,
  scheduleAt,
  createCountdown,
}; 