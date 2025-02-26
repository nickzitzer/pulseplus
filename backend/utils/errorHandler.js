/**
 * @module errorHandler
 * @description Standardized error handling utilities for route handlers
 * @requires ./appError
 * @requires ./logger
 */

const AppError = require('./appError');
const { logger } = require('./logger');

/**
 * @function asyncHandler
 * @description Wraps an async route handler to standardize error handling
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function with standardized error handling
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await UserService.getUsers();
 *   res.json(users);
 * }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @function createErrorResponse
 * @description Creates a standardized error response object
 * @param {Error} error - Error object
 * @returns {Object} Standardized error response object
 */
const createErrorResponse = (error) => {
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'INTERNAL_ERROR';
  const message = error.message || 'An unexpected error occurred';
  
  // Log the error
  if (statusCode >= 500) {
    logger.error(`[${errorCode}] ${message}`, {
      stack: error.stack,
      statusCode,
      path: error.path
    });
  } else {
    logger.warn(`[${errorCode}] ${message}`, {
      statusCode,
      path: error.path
    });
  }
  
  return {
    success: false,
    error: {
      code: errorCode,
      message,
      statusCode,
      details: error.details || null,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  };
};

/**
 * @function errorMiddleware
 * @description Express middleware for standardized error handling
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const errorMiddleware = (err, req, res, next) => {
  // Add request path to error for logging
  err.path = req.path;
  
  // Create standardized error response
  const errorResponse = createErrorResponse(err);
  
  // Send error response
  res.status(errorResponse.error.statusCode).json(errorResponse);
};

/**
 * @function notFoundMiddleware
 * @description Express middleware for handling 404 errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const notFoundMiddleware = (req, res, next) => {
  const error = new AppError(`Cannot ${req.method} ${req.path}`, 404, 'NOT_FOUND');
  next(error);
};

module.exports = {
  asyncHandler,
  createErrorResponse,
  errorMiddleware,
  notFoundMiddleware
}; 