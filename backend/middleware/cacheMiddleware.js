/**
 * @module cacheMiddleware
 * @description Express middleware for response caching with configurable patterns and durations
 * @requires ../utils/cacheService
 * @requires ../utils/cacheConfig
 */

const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');
const { CACHE_DURATIONS } = require('../utils/cacheConfig');

/**
 * @typedef {Object} CacheOptions
 * @property {string} cacheName - Name of the cache to use (from CACHE_NAMES)
 * @property {Function} keyGenerator - Function to generate cache key from request
 * @property {number} [duration] - Cache duration in milliseconds
 */

/**
 * @typedef {Object} CacheKeyGenerator
 * @callback CacheKeyGenerator
 * @param {Object} req - Express request object
 * @returns {string} Generated cache key
 */

/**
 * @function createCacheMiddleware
 * @description Creates a caching middleware for route handlers
 * @param {string} cacheName - Name of the cache to use
 * @param {CacheKeyGenerator} keyGenerator - Function to generate cache key from request
 * @param {Object} [options] - Additional caching options
 * @param {number} [options.duration] - Custom cache duration in milliseconds
 * @returns {Function} Express middleware function
 * @throws {Error} If cache name is invalid or key generation fails
 * 
 * @example
 * // Basic usage with default duration
 * router.get('/profile/:id',
 *   createCacheMiddleware(
 *     CACHE_NAMES.USER,
 *     (req) => `profile-${req.params.id}`
 *   ),
 *   profileController.getProfile
 * );
 * 
 * // With custom duration
 * router.get('/leaderboard',
 *   createCacheMiddleware(
 *     CACHE_NAMES.GAME,
 *     (req) => `leaderboard-${req.query.timeframe}`,
 *     { duration: 5 * 60 * 1000 } // 5 minutes
 *   ),
 *   leaderboardController.getLeaderboard
 * );
 */
const createCacheMiddleware = (cacheName, keyGenerator, options = {}) => {
  const duration = options.duration || CACHE_DURATIONS[cacheName] || 300000; // 5 minutes default

  /**
   * @function middleware
   * @private
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Promise<void>}
   */
  return async (req, res, next) => {
    try {
      const cacheKey = keyGenerator(req);
      const cachedData = cacheManager.get(cacheName, cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function(data) {
        cacheManager.set(cacheName, cacheKey, data, duration);
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  createCacheMiddleware
}; 