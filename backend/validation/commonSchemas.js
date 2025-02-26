/**
 * @module commonSchemas
 * @description Common validation schemas used across the application
 * @requires joi
 */

const Joi = require('joi');

/**
 * @constant {Object} commonSchemas
 * @description Common validation schemas used across the application
 */
const commonSchemas = {
  /**
   * @constant {Joi.Schema} uuid
   * @description UUID validation schema
   */
  uuid: Joi.string().guid({ version: 'uuidv4' }),

  /**
   * @constant {Joi.Schema} pagination
   * @description Common pagination parameters schema
   */
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  /**
   * @constant {Joi.Schema} dateRange
   * @description Date range validation schema
   */
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }),

  /**
   * @constant {Joi.Schema} search
   * @description Search query validation schema
   */
  search: Joi.object({
    query: Joi.string().min(1).max(100),
    fields: Joi.array().items(Joi.string())
  })
};

module.exports = commonSchemas; 