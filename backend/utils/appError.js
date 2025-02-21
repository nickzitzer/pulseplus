/**
 * @class AppError
 * @extends Error
 * @description Custom error class for handling application-specific errors with HTTP status codes
 * @classdesc Provides structured error handling with status codes, error codes, and optional details
 */
class AppError extends Error {
  /**
   * @constructor
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [errorCode='INTERNAL_ERROR'] - Application-specific error code
   * @param {*} [details=null] - Additional error details
   */
  constructor(message, statusCode, errorCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || 'INTERNAL_ERROR';
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError; 