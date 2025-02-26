/**
 * @module middlewareErrorBoundary
 * @description Utilities for creating error boundaries around middleware
 * @requires ../utils/logger
 * @requires ../utils/appError
 */

const { logger } = require('./logger');
const AppError = require('./appError');

/**
 * @function createErrorBoundary
 * @description Creates an error boundary around a middleware function
 * @param {Function} middleware - The middleware function to wrap
 * @param {Object} [options] - Error boundary options
 * @param {string} [options.name='unnamed'] - Name of the middleware for identification
 * @param {Function} [options.errorHandler] - Custom error handler function
 * @param {boolean} [options.continueOnError=false] - Whether to continue execution on error
 * @returns {Function} Wrapped middleware function with error boundary
 * 
 * @example
 * // Basic usage
 * app.use(createErrorBoundary(
 *   myMiddleware,
 *   { name: 'myMiddleware' }
 * ));
 * 
 * // With custom error handler
 * app.use(createErrorBoundary(
 *   myMiddleware,
 *   {
 *     name: 'myMiddleware',
 *     errorHandler: (err, req, res, next) => {
 *       // Custom error handling logic
 *       next(new AppError('Custom error message', 500));
 *     }
 *   }
 * ));
 * 
 * // Continue on error
 * app.use(createErrorBoundary(
 *   myMiddleware,
 *   {
 *     name: 'myMiddleware',
 *     continueOnError: true
 *   }
 * ));
 */
function createErrorBoundary(middleware, options = {}) {
  const {
    name = 'unnamed',
    errorHandler,
    continueOnError = false
  } = options;

  return async (req, res, next) => {
    try {
      // If middleware returns a promise, await it
      const result = middleware(req, res, (err) => {
        if (err) {
          handleError(err, req, res, next);
        } else {
          next();
        }
      });

      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      handleError(error, req, res, next);
    }

    /**
     * @function handleError
     * @private
     * @description Handles errors from middleware
     * @param {Error} error - The error that occurred
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    function handleError(error, req, res, next) {
      // Log the error
      logger.error(`Error in middleware '${name}':`, {
        middleware: name,
        path: req.originalUrl,
        method: req.method,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.statusCode || 500
        }
      });

      // Use custom error handler if provided
      if (typeof errorHandler === 'function') {
        try {
          return errorHandler(error, req, res, next);
        } catch (handlerError) {
          logger.error(`Error in custom error handler for '${name}':`, {
            middleware: name,
            error: handlerError.message
          });
          // Fall through to default handling
        }
      }

      // Default error handling
      if (continueOnError) {
        // Continue middleware chain but store error in request
        req.middlewareErrors = req.middlewareErrors || [];
        req.middlewareErrors.push({
          middleware: name,
          error: {
            message: error.message,
            code: error.statusCode || 500
          }
        });
        next();
      } else {
        // Convert to AppError if it's not already
        if (!(error instanceof AppError)) {
          error = new AppError(
            `Middleware '${name}' failed: ${error.message}`,
            error.statusCode || 500
          );
        }
        next(error);
      }
    }
  };
}

/**
 * @function wrapWithErrorBoundaries
 * @description Wraps all middleware in an array with error boundaries
 * @param {Function[]} middlewareArray - Array of middleware functions
 * @param {Object} [options] - Error boundary options
 * @param {string} [options.groupName='middleware'] - Base name for the middleware group
 * @param {boolean} [options.continueOnError=false] - Whether to continue execution on error
 * @returns {Function[]} Array of wrapped middleware functions
 * 
 * @example
 * // Wrap an array of middleware
 * const securedRoute = wrapWithErrorBoundaries([
 *   authMiddleware,
 *   validateRequest,
 *   checkPermissions
 * ], { groupName: 'securedRoute' });
 * 
 * router.get('/protected', securedRoute, controller.handler);
 */
function wrapWithErrorBoundaries(middlewareArray, options = {}) {
  const { groupName = 'middleware', continueOnError = false } = options;
  
  return middlewareArray.map((middleware, index) => {
    const name = middleware.name || `${groupName}_${index}`;
    return createErrorBoundary(middleware, {
      name,
      continueOnError
    });
  });
}

module.exports = {
  createErrorBoundary,
  wrapWithErrorBoundaries
}; 