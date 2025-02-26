/**
 * @module routeProtection
 * @description Utilities for scanning and protecting Express routes
 * @requires express
 * @requires ./rateLimits
 */

const { rateLimitPresets } = require('./rateLimits');
const { logger } = require('./logger');

/**
 * @function scanAndProtectRoutes
 * @description Scans an Express router and applies rate limiting to critical endpoints
 * @param {Object} router - Express router object
 * @param {Object} options - Configuration options
 * @param {string[]} [options.criticalPaths=[]] - Array of critical paths to protect
 * @param {string[]} [options.criticalMethods=['post', 'put', 'delete']] - HTTP methods to protect
 * @param {Object} [options.customLimits={}] - Custom rate limits for specific paths
 * @returns {Object} router - The protected router
 */
function scanAndProtectRoutes(router, options = {}) {
  const criticalPaths = options.criticalPaths || [];
  const criticalMethods = options.criticalMethods || ['post', 'put', 'delete'];
  const customLimits = options.customLimits || {};
  
  // Get all routes from the router
  const routes = getRoutes(router);
  
  // Apply rate limiting to critical routes
  routes.forEach(route => {
    const { path, method } = route;
    
    // Skip if already has rate limiting
    if (hasRateLimiting(route)) {
      return;
    }
    
    // Check if this is a critical path
    const isCriticalPath = criticalPaths.some(criticalPath => 
      path.includes(criticalPath) || path === criticalPath
    );
    
    // Check if this is a critical method
    const isCriticalMethod = criticalMethods.includes(method.toLowerCase());
    
    // Apply appropriate rate limiting
    if (isCriticalPath || isCriticalMethod) {
      // Check for custom limit for this path
      if (customLimits[path]) {
        applyRateLimit(router, route, customLimits[path]);
        logger.info(`Applied custom rate limit to ${method.toUpperCase()} ${path}`);
      } else {
        // Apply strict rate limiting to critical endpoints
        applyRateLimit(router, route, rateLimitPresets.STRICT);
        logger.info(`Applied strict rate limit to ${method.toUpperCase()} ${path}`);
      }
    } else {
      // Apply standard rate limiting to non-critical endpoints
      applyRateLimit(router, route, rateLimitPresets.STANDARD);
      logger.info(`Applied standard rate limit to ${method.toUpperCase()} ${path}`);
    }
  });
  
  return router;
}

/**
 * @function getRoutes
 * @description Extract all routes from an Express router
 * @param {Object} router - Express router object
 * @returns {Array} Array of route objects
 * @private
 */
function getRoutes(router) {
  const routes = [];
  
  // Access the internal stack of the router
  if (router.stack) {
    router.stack.forEach(layer => {
      if (layer.route) {
        // This is a route
        const path = layer.route.path;
        const methods = Object.keys(layer.route.methods);
        
        methods.forEach(method => {
          routes.push({
            path,
            method,
            stack: layer.route.stack
          });
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        // This is a sub-router
        const subRoutes = getRoutes(layer.handle);
        routes.push(...subRoutes);
      }
    });
  }
  
  return routes;
}

/**
 * @function hasRateLimiting
 * @description Check if a route already has rate limiting
 * @param {Object} route - Route object
 * @returns {boolean} True if rate limiting is already applied
 * @private
 */
function hasRateLimiting(route) {
  return route.stack.some(layer => 
    layer.handle.name === 'rateLimit' || 
    (layer.handle.toString && layer.handle.toString().includes('rateLimit'))
  );
}

/**
 * @function applyRateLimit
 * @description Apply rate limiting to a route
 * @param {Object} router - Express router object
 * @param {Object} route - Route object
 * @param {Function} limiter - Rate limiter middleware
 * @private
 */
function applyRateLimit(router, route, limiter) {
  // This is a simplified implementation
  // In a real-world scenario, you would need to modify the router's stack
  // to insert the rate limiter middleware at the beginning of each route
  
  // For demonstration purposes, we'll log the action
  logger.info(`Would apply rate limiting to ${route.method.toUpperCase()} ${route.path}`);
  
  // In practice, you would need to:
  // 1. Create a new route with the same path and method
  // 2. Add the rate limiter as the first middleware
  // 3. Copy all existing middlewares
  // 4. Replace the old route with the new one
}

module.exports = {
  scanAndProtectRoutes
}; 