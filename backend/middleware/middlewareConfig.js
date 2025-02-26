/**
 * @module middlewareConfig
 * @description Centralized middleware configuration and composition for routes
 */

const { verifyToken, checkPermissions } = require('./auth');
const { rateLimitPresets } = require('../utils/rateLimits');
const { validateRequest } = require('../utils/validation');
const { responseHandler } = require('../utils/responseHandler');
const { cacheManager } = require('../utils/cacheService');
const { measureMiddleware, wrapAllMiddleware } = require('../utils/middlewareMetrics');
const { registerMiddleware } = require('../utils/middlewareVersioning');
const { createErrorBoundary } = require('../utils/middlewareErrorBoundary');

/**
 * @typedef {Object} MiddlewareConfig
 * @property {boolean} [useRateLimit=true] - Whether to apply rate limiting
 * @property {boolean} [useAuth=true] - Whether to apply authentication
 * @property {Object} [validation] - Validation schema configuration
 * @property {string[]} [permissions] - Required permissions
 * @property {boolean} [useCache=false] - Whether to apply caching
 * @property {number} [cacheDuration] - Cache duration in milliseconds
 */

/**
 * @typedef {Object} ValidationConfig
 * @property {Object} [params] - Parameters validation schema
 * @property {Object} [query] - Query validation schema
 * @property {Object} [body] - Request body validation schema
 */

/**
 * Standard middleware order:
 * 1. Rate Limiting
 * 2. Authentication
 * 3. Validation
 * 4. Permission Check
 * 5. Caching (if enabled)
 * 6. Business Logic
 */

/**
 * @function composeMiddleware
 * @description Composes middleware stack based on configuration
 * @param {MiddlewareConfig} config - Middleware configuration object
 * @returns {Array<Function>} Array of middleware functions
 * 
 * @example
 * const middlewareStack = composeMiddleware({
 *   useRateLimit: true,
 *   useAuth: true,
 *   validation: {
 *     body: userSchema,
 *     params: idSchema
 *   },
 *   permissions: ['MANAGE_USERS'],
 *   useCache: true,
 *   cacheDuration: 5 * 60 * 1000 // 5 minutes
 * });
 */
const composeMiddleware = (config = {}) => {
  const middleware = [];

  // 1. Rate Limiting
  if (config.useRateLimit !== false) {
    const rateLimitMiddleware = registerMiddleware(
      rateLimitPresets.STANDARD,
      'rateLimit',
      { description: 'Standard rate limiting middleware' }
    );
    middleware.push(
      measureMiddleware(
        createErrorBoundary(rateLimitMiddleware, { name: 'rateLimit' }),
        'rateLimit'
      )
    );
  }

  // 2. Authentication
  if (config.useAuth !== false) {
    const authMiddleware = registerMiddleware(
      verifyToken,
      'authentication',
      { description: 'JWT authentication middleware' }
    );
    middleware.push(
      measureMiddleware(
        createErrorBoundary(authMiddleware, { name: 'authentication' }),
        'authentication'
      )
    );
  }

  // 3. Validation
  if (config.validation) {
    const validationMiddleware = registerMiddleware(
      validateRequest(config.validation),
      'validation',
      { description: 'Request validation middleware' }
    );
    middleware.push(
      measureMiddleware(
        createErrorBoundary(validationMiddleware, { name: 'validation' }),
        'validation'
      )
    );
  }

  // 4. Permission Check
  if (config.permissions?.length) {
    const permissionsMiddleware = registerMiddleware(
      checkPermissions(config.permissions),
      'permissions',
      { description: `Permission check for: ${config.permissions.join(', ')}` }
    );
    middleware.push(
      measureMiddleware(
        createErrorBoundary(permissionsMiddleware, { name: 'permissions' }),
        'permissions'
      )
    );
  }

  // 5. Caching
  if (config.useCache) {
    const cachingMiddleware = registerMiddleware(
      async (req, res, next) => {
        const cacheKey = req.originalUrl;
        try {
          const cachedData = await cacheManager.get(cacheKey);
          if (cachedData) {
            return responseHandler.sendSuccess(res, cachedData);
          }
          // Attach cache function to res.locals for use in route handler
          res.locals.cache = (data) => {
            return cacheManager.set(cacheKey, data, config.cacheDuration);
          };
          next();
        } catch (error) {
          next(error);
        }
      },
      'caching',
      { description: `Response caching with ${config.cacheDuration}ms TTL` }
    );
    middleware.push(
      measureMiddleware(
        createErrorBoundary(cachingMiddleware, { name: 'caching' }),
        'caching'
      )
    );
  }

  return middleware;
};

/**
 * @function createRouteMiddleware
 * @description Creates preset middleware configurations for common route types
 */
const createRouteMiddleware = {
  /**
   * @function public
   * @description Public route with rate limiting only
   */
  public: () => composeMiddleware({
    useAuth: false,
    useRateLimit: true
  }),

  /**
   * @function protected
   * @description Protected route with auth and rate limiting
   */
  protected: (validation) => composeMiddleware({
    useAuth: true,
    useRateLimit: true,
    validation
  }),

  /**
   * @function restricted
   * @description Restricted route with auth, permissions, and rate limiting
   */
  restricted: (permissions, validation) => composeMiddleware({
    useAuth: true,
    useRateLimit: true,
    permissions,
    validation
  }),

  /**
   * @function cached
   * @description Cached route with all security measures
   */
  cached: (permissions, validation, cacheDuration = 5 * 60 * 1000) => composeMiddleware({
    useAuth: true,
    useRateLimit: true,
    permissions,
    validation,
    useCache: true,
    cacheDuration
  })
};

module.exports = {
  composeMiddleware,
  createRouteMiddleware
}; 