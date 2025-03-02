/**
 * Utility functions for formatting text and data
 */

/**
 * Format a number as currency
 * @param value - The number to format
 * @param currency - The currency code (default: 'USD')
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format a date
 * @param date - The date to format
 * @param format - The format to use (default: 'medium')
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'en-US'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, { dateStyle: format }).format(dateObj);
}

/**
 * Format a time
 * @param date - The date/time to format
 * @param format - The format to use (default: 'medium')
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted time string
 */
export function formatTime(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'en-US'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, { timeStyle: format }).format(dateObj);
}

/**
 * Format a date and time
 * @param date - The date/time to format
 * @param dateFormat - The date format to use (default: 'medium')
 * @param timeFormat - The time format to use (default: 'short')
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | string | number,
  dateFormat: 'short' | 'medium' | 'long' | 'full' = 'medium',
  timeFormat: 'short' | 'medium' | 'long' | 'full' = 'short',
  locale: string = 'en-US'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: dateFormat,
    timeStyle: timeFormat,
  }).format(dateObj);
}

/**
 * Format a number
 * @param value - The number to format
 * @param minimumFractionDigits - Minimum fraction digits (default: 0)
 * @param maximumFractionDigits - Maximum fraction digits (default: 2)
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  minimumFractionDigits: number = 0,
  maximumFractionDigits: number = 2,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Format a percentage
 * @param value - The number to format as percentage (0.1 = 10%)
 * @param minimumFractionDigits - Minimum fraction digits (default: 0)
 * @param maximumFractionDigits - Maximum fraction digits (default: 2)
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  minimumFractionDigits: number = 0,
  maximumFractionDigits: number = 2,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Format a file size
 * @param bytes - The size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format achievement progress
 * @param current - Current progress value
 * @param total - Total required for completion
 * @param showPercentage - Whether to include percentage (default: true)
 * @returns Formatted progress string (e.g., "7/10 (70%)")
 */
export function formatProgress(
  current: number,
  total: number,
  showPercentage: boolean = true
): string {
  const percentage = (current / total) * 100;
  const formattedPercentage = formatPercentage(current / total, 0);
  
  return showPercentage
    ? `${current}/${total} (${formattedPercentage})`
    : `${current}/${total}`;
}

/**
 * Truncate text with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export default {
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatProgress,
  truncateText,
}; 