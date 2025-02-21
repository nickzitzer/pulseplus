/**
 * @module utils
 * @description Central export point for all utility modules
 * @requires ./appError
 * @requires ./logger
 * @requires ./routeHelpers
 * @requires ./tokenService
 * @requires ./emailUtils
 * @requires ./validation
 */

// Core utilities
const AppError = require('./appError');
const logger = require('./logger');
const { withTransaction, auditLog, handleImageUpload, validatePermissions } = require('./routeHelpers');
const TokenService = require('./tokenService');
const emailUtils = require('./emailUtils');
const validation = require('./validation');

/**
 * @exports utils
 * @type {Object}
 * @property {Class} AppError - Custom error handling class
 * @property {Object} logger - Winston logger instance
 * @property {Function} withTransaction - Database transaction wrapper
 * @property {Function} auditLog - Audit logging utility
 * @property {Function} handleImageUpload - Image upload handler
 * @property {Function} validatePermissions - Permission validation utility
 * @property {Class} TokenService - JWT token management service
 * @property {Object} emailUtils - Email sending utilities
 * @property {Object} validation - Request validation utilities
 */
module.exports = {
  AppError,
  logger,
  withTransaction,
  auditLog,
  handleImageUpload,
  validatePermissions,
  TokenService,
  emailUtils,
  validation
}; 