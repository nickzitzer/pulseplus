/**
 * @module errorHandlers
 * @description Express error handling middleware for standardized error responses
 * @requires ../utils/responseHandler
 * @requires ../utils/logger
 */

const { responseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

/**
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Always false for error responses
 * @property {Object} error - Error details
 * @property {number} error.code - HTTP status code
 * @property {string} error.message - Error message
 * @property {*} [error.details] - Additional error details
 * @property {string} [error.stack] - Stack trace (development only)
 */

/**
 * @function notFoundHandler
 * @description Middleware for handling 404 Not Found errors
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 * @throws {Error} Passes 404 error to error handler
 * 
 * @example
 * // Use as the last middleware before error handler
 * app.use(notFoundHandler);
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error('Resource not found');
  error.statusCode = 404;
  next(error);
};

/**
 * @function errorHandler
 * @description Global error handling middleware for standardized error responses
 * @param {Error} error - Error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 * @sends {ErrorResponse} Standardized error response
 * 
 * @example
 * // Use as the last middleware in the application
 * app.use(errorHandler);
 * 
 * // Error will be formatted as:
 * // {
 * //   success: false,
 * //   error: {
 * //     code: 500,
 * //     message: "Internal Server Error",
 * //     details: null,
 * //     stack: "Error stack trace in development"
 * //   }
 * // }
 */
const errorHandler = (error, req, res, next) => {
  // Log error details
  logger.error('Error occurred:', {
    path: req.path,
    method: req.method,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.statusCode || 500
    }
  });

  // Send standardized error response
  responseHandler.sendError(res, error);
};

module.exports = {
  notFoundHandler,
  errorHandler
};