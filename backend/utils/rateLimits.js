/**
 * @module rateLimits
 * @description Rate limiting configuration using express-rate-limit with Redis store support
 * @requires express-rate-limit
 * @requires ./appError
 * @requires redis
 * @requires rate-limit-redis
 */

const rateLimit = require('express-rate-limit');
const { TooManyRequestsError } = require('./appError');
const redis = require('redis');
const RedisStore = require('rate-limit-redis');

/**
 * @constant {Object|null} redisClient
 * @description Redis client instance for rate limiting, null if REDIS_URL is not provided
 */
const redisClient = process.env.REDIS_URL 
  ? redis.createClient({ url: process.env.REDIS_URL })
  : null;

/**
 * @constant {RedisStore|undefined} rateLimitStore
 * @description Redis store for rate limiting if Redis client is available
 */
const rateLimitStore = redisClient 
  ? new RedisStore({ client: redisClient, prefix: 'rateLimit:' })
  : undefined;

/**
 * @function baseHandler
 * @description Default handler for rate limit exceeded events
 * @throws {TooManyRequestsError} Always throws with a standard error message
 */
const baseHandler = (req, res) => {
  throw new TooManyRequestsError('Too many requests, please try again later');
};

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
  STANDARD: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    store: rateLimitStore,
    handler: baseHandler
  }),
  
  // Strict limits for sensitive operations
  STRICT: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    store: rateLimitStore,
    handler: baseHandler
  }),
  
  // Very limited operations (e.g. bulk operations, password resets)
  BULK: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    store: rateLimitStore,
    handler: baseHandler
  }),

  // Authentication related limits
  AUTH: {
    LOGIN: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30,
      store: rateLimitStore,
      handler: baseHandler
    }),
    REGISTER: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      store: rateLimitStore,
      handler: baseHandler
    }),
    PASSWORD_RESET: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
      store: rateLimitStore,
      handler: baseHandler
    })
  },

  // Social feature limits
  SOCIAL: {
    FRIEND_REQUESTS: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30,
      store: rateLimitStore,
      handler: baseHandler
    }),
    CHAT_MESSAGES: rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 20,
      store: rateLimitStore,
      handler: baseHandler
    }),
    FEED_POSTS: rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10,
      store: rateLimitStore,
      handler: baseHandler
    })
  },

  // Game and season related limits
  GAME: {
    LEADERBOARD_UPDATE: rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 30,
      store: rateLimitStore,
      handler: baseHandler
    }),
    SEASON_XP: rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 50,
      store: rateLimitStore,
      handler: baseHandler
    }),
    CREATE_SEASON: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      store: rateLimitStore,
      handler: baseHandler
    }),
    MANAGE_SEASON: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30,
      store: rateLimitStore,
      handler: baseHandler
    }),
    BATTLE_PASS: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10,
      store: rateLimitStore,
      handler: baseHandler
    }),
    TIER_MANAGEMENT: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20,
      store: rateLimitStore,
      handler: baseHandler
    })
  },

  // Economy related limits
  ECONOMY: {
    TRANSFER: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20,
      store: rateLimitStore,
      handler: baseHandler
    }),
    PURCHASE: rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10,
      store: rateLimitStore,
      handler: baseHandler
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
const createRateLimiter = (options) => rateLimit({
  ...options,
  store: rateLimitStore,
  handler: baseHandler
});

module.exports = {
  rateLimitPresets,
  createRateLimiter,
  redisClient
}; 