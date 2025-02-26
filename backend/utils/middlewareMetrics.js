/**
 * @module middlewareMetrics
 * @description Utilities for measuring and reporting middleware performance
 * @requires ../utils/logger
 * @requires ../utils/metrics
 */

const { logger } = require('./logger');
const { register, Counter, Histogram } = require('./metrics');

// Create metrics for middleware execution
const middlewareExecutionCounter = new Counter({
  name: 'middleware_execution_total',
  help: 'Total number of middleware executions',
  labelNames: ['middleware', 'path', 'method']
});

const middlewareExecutionDuration = new Histogram({
  name: 'middleware_execution_duration_seconds',
  help: 'Duration of middleware execution in seconds',
  labelNames: ['middleware', 'path', 'method'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

/**
 * @function measureMiddleware
 * @description Creates a middleware wrapper that measures execution time
 * @param {Function} middleware - The middleware function to measure
 * @param {string} name - Name of the middleware for identification
 * @returns {Function} Wrapped middleware function with timing
 * 
 * @example
 * // Wrap an existing middleware
 * app.use(measureMiddleware(authMiddleware, 'auth'));
 * 
 * // Or create a measured middleware inline
 * app.use(measureMiddleware((req, res, next) => {
 *   // middleware logic
 *   next();
 * }, 'customMiddleware'));
 */
function measureMiddleware(middleware, name) {
  return async (req, res, next) => {
    const start = process.hrtime();
    
    // Create a wrapper for next() to capture when middleware finishes
    const measuredNext = (err) => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds + nanoseconds / 1e9;
      
      // Record metrics
      middlewareExecutionCounter.inc({
        middleware: name,
        path: req.route ? req.route.path : req.path,
        method: req.method
      });
      
      middlewareExecutionDuration.observe(
        {
          middleware: name,
          path: req.route ? req.route.path : req.path,
          method: req.method
        },
        duration
      );
      
      // Log execution time if it's slow (> 100ms)
      if (duration > 0.1) {
        logger.warn(`Slow middleware execution: ${name}`, {
          middleware: name,
          path: req.originalUrl,
          method: req.method,
          duration: `${(duration * 1000).toFixed(2)}ms`
        });
      }
      
      // Continue with the middleware chain
      next(err);
    };
    
    try {
      // If middleware returns a promise, wait for it
      const result = middleware(req, res, measuredNext);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      measuredNext(error);
    }
  };
}

/**
 * @function wrapAllMiddleware
 * @description Wraps all middleware in an array with performance measurement
 * @param {Function[]} middlewareArray - Array of middleware functions
 * @param {string} groupName - Base name for the middleware group
 * @returns {Function[]} Array of wrapped middleware functions
 * 
 * @example
 * // Wrap an array of middleware
 * const securedRoute = wrapAllMiddleware([
 *   authMiddleware,
 *   validateRequest,
 *   checkPermissions
 * ], 'securedRoute');
 * 
 * router.get('/protected', securedRoute, controller.handler);
 */
function wrapAllMiddleware(middlewareArray, groupName) {
  return middlewareArray.map((middleware, index) => {
    const name = middleware.name || `${groupName}_${index}`;
    return measureMiddleware(middleware, name);
  });
}

module.exports = {
  measureMiddleware,
  wrapAllMiddleware,
  middlewareExecutionCounter,
  middlewareExecutionDuration
}; 