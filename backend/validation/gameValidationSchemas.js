/**
 * @module gameValidationSchemas
 * @description Validation schemas for game-related operations
 * @requires joi
 */

const Joi = require('joi');
const commonSchemas = require('./commonSchemas');

/**
 * @constant {Object} gameValidationSchemas
 * @description Validation schemas for game-related operations
 */
const gameValidationSchemas = {
  /**
   * @constant {Joi.Schema} createGame
   * @description Schema for creating a new game
   */
  createGame: Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(1000),
    category: Joi.string().required(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').required(),
    timeLimit: Joi.number().integer().min(30).max(3600),
    isPublic: Joi.boolean().default(false),
    tags: Joi.array().items(Joi.string().max(30)).max(10)
  }),

  /**
   * @constant {Joi.Schema} updateGame
   * @description Schema for updating an existing game
   */
  updateGame: Joi.object({
    title: Joi.string().min(3).max(100),
    description: Joi.string().max(1000),
    category: Joi.string(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    timeLimit: Joi.number().integer().min(30).max(3600),
    isPublic: Joi.boolean(),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
    status: Joi.string().valid('draft', 'published', 'archived')
  }),

  /**
   * @constant {Joi.Schema} gameParams
   * @description Schema for game ID parameter
   */
  gameParams: Joi.object({
    id: commonSchemas.uuid
  }),

  /**
   * @constant {Joi.Schema} gameQuery
   * @description Schema for game query parameters
   */
  gameQuery: Joi.object({
    category: Joi.string(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    isPublic: Joi.boolean(),
    status: Joi.string().valid('draft', 'published', 'archived'),
    createdBy: Joi.string().guid({ version: 'uuidv4' }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().max(100)
  })
};

module.exports = gameValidationSchemas; 