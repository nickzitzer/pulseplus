/**
 * @module logger
 * @description Winston-based logger configuration for application-wide logging
 * @requires winston
 */

const winston = require('winston');

/**
 * @constant {winston.Logger} logger
 * @description Configured Winston logger instance with the following features:
 * - JSON format with timestamps for structured logging
 * - File transport for error logs (error.log)
 * - File transport for all logs (combined.log)
 * - Console transport in non-production environments
 * 
 * @example
 * // Log an info message
 * logger.info('User logged in', { userId: '123', timestamp: new Date() });
 * 
 * // Log an error
 * logger.error('Database connection failed', { 
 *   error: err.message,
 *   stack: err.stack
 * });
 * 
 * // Log a warning
 * logger.warn('Rate limit approaching', { 
 *   currentRate: '95/100',
 *   userId: '123'
 * });
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;