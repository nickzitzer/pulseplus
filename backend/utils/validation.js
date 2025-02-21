/**
 * @module validation
 * @description Request validation utilities using Joi schemas
 * @requires joi
 * @requires ./responseHandler
 * @requires ./appError
 */

const Joi = require('joi');
const { responseHandler } = require('./responseHandler');
const AppError = require('./appError');

/**
 * @constant {Object} commonSchemas
 * @description Common validation schemas used across the application
 * @property {Joi.Schema} uuid - UUID validation schema
 * @property {Joi.Schema} pagination - Common pagination parameters schema
 */
const commonSchemas = {
  /**
   * @type {Joi.Schema}
   * @description UUID validation schema requiring a valid UUID string
   */
  uuid: Joi.string().uuid().required(),

  /**
   * @type {Joi.Schema}
   * @description Pagination parameters validation schema
   * @property {number} page - Page number (min: 1)
   * @property {number} limit - Items per page (min: 1, max: 100)
   * @property {string} [sort] - Sort field and direction (format: field:(asc|desc))
   * @property {string} [search] - Search term (max length: 100)
   */
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().pattern(/^[a-zA-Z_]+:(asc|desc)$/),
    search: Joi.string().max(100)
  })
};

/**
 * @function validateRequest
 * @description Express middleware for request validation using Joi schemas
 * @param {Object|Joi.Schema} schemas - Validation schemas or single body schema
 * @param {Joi.Schema} [schemas.params] - Schema for request parameters
 * @param {Joi.Schema} [schemas.query] - Schema for query parameters
 * @param {Joi.Schema} [schemas.body] - Schema for request body
 * @returns {Function} Express middleware function
 * @throws {AppError} 400 - If validation fails for any part of the request
 * @example
 * // Using object schema
 * validateRequest({
 *   params: paramSchema,
 *   query: querySchema,
 *   body: bodySchema
 * })
 * 
 * // Using single body schema
 * validateRequest(bodySchema)
 */
const validateRequest = (schemas) => {
  // Convert single schema to standardized object format
  if (schemas instanceof Joi.Schema) {
    schemas = { body: schemas };
  }

  return async (req, res, next) => {
    try {
      if (schemas.params) {
        const { error } = schemas.params.validate(req.params);
        if (error) throw new AppError(error.details[0].message, 400);
      }

      if (schemas.query) {
        const { error } = schemas.query.validate(req.query);
        if (error) throw new AppError(error.details[0].message, 400);
      }

      if (schemas.body) {
        const { error } = schemas.body.validate(req.body);
        if (error) throw new AppError(error.details[0].message, 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  validateRequest,
  responseHandler,
  commonSchemas
}; 