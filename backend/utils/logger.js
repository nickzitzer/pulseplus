/**
 * @module logger
 * @description Winston-based logger configuration for application-wide logging
 * @requires winston
 */

const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Get service version from package.json
let serviceVersion = '0.0.0';
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  serviceVersion = packageJson.version || '0.0.0';
} catch (error) {
  console.error('Failed to read package.json for version information');
}

// Store trace IDs for the current request context
const asyncLocalStorage = new (require('async_hooks')).AsyncLocalStorage();

/**
 * @function initRequestContext
 * @description Initialize the request context with a trace ID
 * @param {string} [traceId] - Optional trace ID to use (generates a new one if not provided)
 * @returns {Object} The context object with traceId
 */
function initRequestContext(traceId = uuidv4()) {
  const context = new Map();
  context.set('traceId', traceId);
  context.set('startTime', Date.now());
  return context;
}

/**
 * @function getTraceId
 * @description Get the current trace ID from the request context
 * @returns {string} The current trace ID or a new one if not in a context
 */
function getTraceId() {
  const context = asyncLocalStorage.getStore();
  return context ? context.get('traceId') : uuidv4();
}

/**
 * @function getDuration
 * @description Calculate the duration since the start of the request
 * @returns {number|undefined} The duration in milliseconds or undefined if not in a request context
 */
function getDuration() {
  const context = asyncLocalStorage.getStore();
  if (context && context.get('startTime')) {
    return Date.now() - context.get('startTime');
  }
  return undefined;
}

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
 * logger.info('User logged in', { userId: '123' });
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
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format((info) => {
      // Add standard fields to all log entries
      info.service = 'backend';
      info.version = serviceVersion;
      info.environment = process.env.NODE_ENV || 'development';
      info.hostname = os.hostname();
      
      // Add trace ID if available
      info.traceId = getTraceId();
      
      // Add duration if available
      const duration = getDuration();
      if (duration !== undefined) {
        info.duration = duration;
      }
      
      return info;
    })()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, traceId, ...rest }) => {
        const restString = Object.keys(rest).length ? 
          ` ${JSON.stringify(rest)}` : '';
        return `${timestamp} [${level}] [${traceId}]: ${message}${restString}`;
      })
    )
  }));
}

// Create middleware to initialize request context with trace ID
const requestLoggerMiddleware = (req, res, next) => {
  // Use existing trace ID from headers or generate a new one
  const traceId = req.headers['x-trace-id'] || uuidv4();
  
  // Set trace ID in response headers
  res.setHeader('x-trace-id', traceId);
  
  // Initialize context with trace ID and run the request in this context
  const context = initRequestContext(traceId);
  
  asyncLocalStorage.run(context, () => {
    // Log request start
    logger.info(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Capture response finish to log request completion
    res.on('finish', () => {
      const duration = getDuration();
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length')
      });
    });
    
    next();
  });
};

module.exports = {
  logger,
  requestLoggerMiddleware,
  initRequestContext,
  getTraceId
};