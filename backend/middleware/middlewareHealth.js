/**
 * @module middlewareHealth
 * @description Middleware for checking the health of middleware components
 * @requires ../utils/logger
 * @requires ../utils/middlewareVersioning
 * @requires ../utils/middlewareMetrics
 */

const { logger } = require('../utils/logger');
const { getMiddlewareVersions } = require('../utils/middlewareVersioning');
const { middlewareExecutionCounter, middlewareExecutionDuration } = require('../utils/middlewareMetrics');

/**
 * @function getMiddlewareMetrics
 * @description Gets metrics for middleware execution
 * @returns {Object} Middleware metrics
 */
function getMiddlewareMetrics() {
  // Get execution counts
  const executionCounts = {};
  const executionTimes = {};
  
  try {
    // This is a simplified approach - in a real implementation,
    // you would use the Prometheus client to get actual metrics
    // from the registry
    
    // For demonstration purposes, we'll return placeholder data
    // In a real implementation, you would query the Prometheus registry
    return {
      status: 'available',
      metrics: {
        totalExecutions: 0,
        averageResponseTime: '0ms',
        slowestMiddleware: 'none',
        fastestMiddleware: 'none'
      }
    };
  } catch (error) {
    logger.error('Failed to get middleware metrics', { error });
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * @function middlewareHealthCheck
 * @description Express middleware for middleware health check endpoint
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 * @sends {Object} Middleware health status response
 * 
 * @example
 * // Use as route handler
 * app.get('/health/middleware', middlewareHealthCheck);
 */
async function middlewareHealthCheck(req, res) {
  try {
    // Get middleware versions
    const versions = getMiddlewareVersions();
    
    // Get middleware metrics
    const metrics = getMiddlewareMetrics();
    
    // Prepare response
    const healthStatus = {
      status: 'healthy',
      middlewareCount: versions.length,
      versions: versions,
      metrics: metrics,
      timestamp: new Date().toISOString()
    };
    
    res.json(healthStatus);
  } catch (error) {
    logger.error('Middleware health check failed', { error });
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  middlewareHealthCheck,
  getMiddlewareMetrics
}; 