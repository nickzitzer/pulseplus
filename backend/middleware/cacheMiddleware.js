/**
 * @module cacheMiddleware
 * @description Express middleware for response caching with configurable patterns and durations
 * @requires ../utils/cacheService
 * @requires ../utils/cacheConfig
 * @requires ../utils/logger
 */

const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');
const { getCacheKey, getCacheDuration, CACHE_PATTERNS } = require('../utils/cacheConfig');
const { logger } = require('../utils/logger');

/**
 * @function createResourceCacheMiddleware
 * @description Creates a caching middleware for resource endpoints
 * @param {string} resource - Resource type (USER, GAME, etc.)
 * @param {string} pattern - Pattern type (SINGLE, LIST, etc.)
 * @param {Function} [paramsExtractor] - Function to extract params from request
 * @param {Object} [options] - Additional options
 * @param {string} [options.cacheName] - Cache name to use
 * @param {number} [options.duration] - Custom cache duration
 * @returns {Function} Express middleware function
 * @example
 * // Cache a single user endpoint
 * router.get('/users/:id',
 *   createResourceCacheMiddleware('USER', 'SINGLE', req => req.params.id),
 *   userController.getUser
 * );
 * 
 * // Cache a list endpoint with query parameters
 * router.get('/users',
 *   createResourceCacheMiddleware('USER', 'LIST', req => req.query),
 *   userController.getUsers
 * );
 */
const createResourceCacheMiddleware = (resource, pattern, paramsExtractor = req => req.params.id, options = {}) => {
  const cacheName = options.cacheName || CACHE_NAMES.DEFAULT;
  const duration = options.duration || getCacheDuration(resource, pattern);
  
  return async (req, res, next) => {
    try {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      // Extract params from request
      const params = paramsExtractor(req);
      
      // Generate cache key
      const cacheKey = getCacheKey(resource, pattern, params);
      
      // Try to get from cache
      const cachedData = cacheManager.get(cacheName, cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit: ${cacheName}/${cacheKey}`);
        return res.json(cachedData);
      }
      
      logger.debug(`Cache miss: ${cacheName}/${cacheKey}`);
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        // Don't cache error responses
        if (data && data.success !== false) {
          cacheManager.set(cacheName, cacheKey, data, duration);
          logger.debug(`Cache set: ${cacheName}/${cacheKey}`, { ttl: duration });
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next(error);
    }
  };
};

/**
 * @function createCacheMiddleware
 * @description Legacy function for backward compatibility
 * @param {string} cacheName - Cache name
 * @param {Function} keyGenerator - Function to generate cache key
 * @param {Object} [options] - Additional options
 * @returns {Function} Express middleware function
 * @deprecated Use createResourceCacheMiddleware instead
 */
const createCacheMiddleware = (cacheName, keyGenerator, options = {}) => {
  const duration = options.duration || 300000; // 5 minutes default
  
  logger.warn('Using deprecated createCacheMiddleware, consider switching to createResourceCacheMiddleware');
  
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
  createCacheMiddleware,
  createResourceCacheMiddleware
}; 