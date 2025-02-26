/**
 * @module rateLimits
 * @description Rate limiting configuration using express-rate-limit with Redis store support
 * @requires express-rate-limit
 * @requires ./appError
 * @requires ../config/redis
 * @requires rate-limit-redis
 * @requires ./configFactory
 * @requires ./logger
 */

const rateLimit = require('express-rate-limit');
const { TooManyRequestsError } = require('./appError');
const redisClient = require('../config/redis');
const RedisStore = require('rate-limit-redis');
const ConfigFactory = require('./configFactory');
const { logger } = require('./logger');

/**
 * @function createRedisStore
 * @description Creates a new Redis store with a unique prefix for each rate limiter
 * @param {string} prefix - Unique prefix for this rate limiter
 * @returns {RedisStore|undefined} Redis store or undefined if Redis is not available
 */
const createRedisStore = (prefix) => {
  if (!redisClient) return undefined;
  
  // Create an adapter for ioredis to work with rate-limit-redis
  const redisStoreAdapter = {
    client: redisClient,
    prefix: `rateLimit:${prefix}:`,
    // Add sendCommand method to make it compatible with rate-limit-redis
    sendCommand: (...args) => {
      // Convert args to the format expected by ioredis
      return redisClient.call(...args);
    }
  };
  
  return new RedisStore(redisStoreAdapter);
};

/**
 * @function baseHandler
 * @description Default handler for rate limit exceeded events
 * @throws {TooManyRequestsError} Always throws with a standard error message
 */
const baseHandler = (req, res) => {
  throw new TooManyRequestsError('Too many requests, please try again later');
};

/**
 * @function createStandardRateLimiter
 * @description Creates a rate limiter with standardized configuration
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware rate limiter
 */
function createStandardRateLimiter(options = {}) {
  // Get standardized security configuration
  const securityConfig = ConfigFactory.createSecurityConfig(options);
  
  // Create a unique store for this rate limiter
  const prefix = options.prefix || `limiter_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  return rateLimit({
    windowMs: options.windowMs || securityConfig.rateLimit.windowMs,
    max: options.max || securityConfig.rateLimit.max,
    standardHeaders: options.standardHeaders !== undefined ? options.standardHeaders : securityConfig.rateLimit.standardHeaders,
    legacyHeaders: options.legacyHeaders !== undefined ? options.legacyHeaders : securityConfig.rateLimit.legacyHeaders,
    store: createRedisStore(prefix),
    handler: options.handler || baseHandler,
    skip: options.skip || (() => false)
  });
}

/**
 * @constant {Object} rateLimitPresets
 * @description Predefined rate limit configurations for different API endpoints
 * 
 * @property {Object} STANDARD - Standard API access limits (100 requests per 15 minutes)
 * @property {Object} STRICT - Strict limits for sensitive operations (20 requests per minute)
 * @property {Object} BULK - Very limited operations like bulk actions (10 requests per hour)
 * 
 * @property {Object} AUTH - Authentication related limits
 * @property {Object} AUTH.LOGIN - Login attempt limits (30 requests per 15 minutes)
 * @property {Object} AUTH.REGISTER - Registration limits (5 requests per hour)
 * @property {Object} AUTH.PASSWORD_RESET - Password reset limits (3 requests per hour)
 * 
 * @property {Object} SOCIAL - Social feature limits
 * @property {Object} SOCIAL.FRIEND_REQUESTS - Friend request limits (30 requests per 15 minutes)
 * @property {Object} SOCIAL.CHAT_MESSAGES - Chat message limits (20 messages per minute)
 * @property {Object} SOCIAL.FEED_POSTS - Feed post limits (10 posts per 5 minutes)
 * 
 * @property {Object} GAME - Game and season related limits
 * @property {Object} GAME.LEADERBOARD_UPDATE - Leaderboard update limits (30 updates per 5 minutes)
 * @property {Object} GAME.SEASON_XP - Season XP update limits (50 updates per minute)
 * @property {Object} GAME.CREATE_SEASON - Season creation limits (5 creations per hour)
 * @property {Object} GAME.MANAGE_SEASON - Season management limits (30 operations per 15 minutes)
 * @property {Object} GAME.BATTLE_PASS - Battle pass operation limits (10 operations per hour)
 * @property {Object} GAME.TIER_MANAGEMENT - Tier management limits (20 operations per 15 minutes)
 * 
 * @property {Object} ECONOMY - Economy related limits
 * @property {Object} ECONOMY.TRANSFER - Transfer limits (20 transfers per 15 minutes)
 * @property {Object} ECONOMY.PURCHASE - Purchase limits (10 purchases per 5 minutes)
 * 
 * @example
 * // Use standard rate limiting for a route
 * app.get('/api/users', rateLimitPresets.STANDARD, usersController.getUsers);
 * 
 * // Use strict rate limiting for sensitive operations
 * app.post('/api/admin/users', rateLimitPresets.STRICT, adminController.createUser);
 * 
 * // Use authentication rate limiting for login
 * app.post('/api/auth/login', rateLimitPresets.AUTH.LOGIN, authController.login);
 */
const rateLimitPresets = {
  // Standard API access (read operations)
  STANDARD: createStandardRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  }),
  
  // Strict limits for sensitive operations
  STRICT: createStandardRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20
  }),
  
  // Very limited operations (e.g. bulk operations, password resets)
  BULK: createStandardRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10
  }),

  // Authentication related limits
  AUTH: {
    LOGIN: createStandardRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30
    }),
    REGISTER: createStandardRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5
    }),
    PASSWORD_RESET: createStandardRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3
    })
  },

  // Social feature limits
  SOCIAL: {
    FRIEND_REQUESTS: createStandardRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30
    }),
    CHAT_MESSAGES: createStandardRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 20
    }),
    FEED_POSTS: createStandardRateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10
    })
  },

  // Game and season related limits
  GAME: {
    LEADERBOARD_UPDATE: createStandardRateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 30
    }),
    SEASON_XP: createStandardRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 50
    }),
    CREATE_SEASON: createStandardRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5
    }),
    MANAGE_SEASON: createStandardRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30
    }),
    BATTLE_PASS: createStandardRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10
    }),
    TIER_MANAGEMENT: createStandardRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20
    })
  },

  // Economy related limits
  ECONOMY: {
    TRANSFER: createStandardRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20
    }),
    PURCHASE: createStandardRateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10
    })
  }
};

/**
 * @function createRateLimiter
 * @description Creates a custom rate limiter with specified options
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - The time window in milliseconds
 * @param {number} options.max - Max number of requests within the time window
 * @param {Function} [options.handler] - Custom handler for rate limit exceeded
 * @returns {Function} Express middleware rate limiter
 * 
 * @example
 * const customLimiter = createRateLimiter({
 *   windowMs: 30 * 60 * 1000, // 30 minutes
 *   max: 50, // 50 requests
 *   handler: (req, res) => {
 *     res.status(429).json({ error: 'Custom rate limit exceeded' });
 *   }
 * });
 */
const createRateLimiter = (options) => {
  logger.debug('Creating custom rate limiter', { 
    windowMs: options.windowMs,
    max: options.max
  });
  
  return createStandardRateLimiter(options);
};

module.exports = {
  rateLimitPresets,
  createRateLimiter,
  createStandardRateLimiter
}; 