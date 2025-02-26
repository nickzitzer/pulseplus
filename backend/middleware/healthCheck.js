/**
 * @module healthCheck
 * @description Middleware for system health checks and monitoring
 * @requires ../utils/logger
 * @requires ../database/connection
 * @requires ../config/redis
 */

const { logger } = require('../utils/logger');
const { pool } = require('../database/connection');
const redisClient = require('../config/redis');
const os = require('os');

/**
 * @typedef {Object} HealthStatus
 * @property {string} status - Overall health status: 'healthy', 'degraded', or 'unhealthy'
 * @property {Object} components - Status of individual components
 * @property {Object} components.database - Database health status
 * @property {Object} components.redis - Redis health status
 * @property {Object} components.system - System health status
 * @property {Object} uptime - Uptime information
 * @property {Object} memory - Memory usage information
 */

/**
 * @function checkDatabaseHealth
 * @description Checks database connection health
 * @returns {Promise<Object>} Database health status
 */
async function checkDatabaseHealth() {
  try {
    const client = await pool.connect();
    try {
      const startTime = process.hrtime();
      const result = await client.query('SELECT 1');
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;
      
      return {
        status: 'healthy',
        responseTime: `${responseTime.toFixed(2)}ms`,
        connections: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      };
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * @function checkRedisHealth
 * @description Checks Redis connection health
 * @returns {Promise<Object>} Redis health status
 */
async function checkRedisHealth() {
  if (!redisClient) {
    return {
      status: 'disabled',
      message: 'Redis is not configured'
    };
  }
  
  try {
    const startTime = process.hrtime();
    await redisClient.ping();
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1000000;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime.toFixed(2)}ms`
    };
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * @function checkSystemHealth
 * @description Checks system health metrics
 * @returns {Object} System health status
 */
function checkSystemHealth() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;
  
  return {
    status: memoryUsagePercent > 90 ? 'degraded' : 'healthy',
    cpu: {
      loadAvg: os.loadavg(),
      cores: os.cpus().length
    },
    memory: {
      total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
      free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
      used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
      usagePercent: `${memoryUsagePercent.toFixed(2)}%`
    }
  };
}

/**
 * @function healthCheckMiddleware
 * @description Express middleware for health check endpoint
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 * @sends {HealthStatus} Health status response
 * 
 * @example
 * // Use as route handler
 * app.get('/health', healthCheckMiddleware);
 */
async function healthCheckMiddleware(req, res) {
  const startTime = process.hrtime();
  
  try {
    // Run health checks in parallel
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth()
    ]);
    
    const systemHealth = checkSystemHealth();
    
    // Determine overall status
    let overallStatus = 'healthy';
    if (dbHealth.status === 'unhealthy' || redisHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (dbHealth.status === 'degraded' || redisHealth.status === 'degraded' || systemHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }
    
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1000000;
    
    const healthStatus = {
      status: overallStatus,
      components: {
        database: dbHealth,
        redis: redisHealth,
        system: systemHealth
      },
      uptime: {
        server: `${(process.uptime() / 60 / 60).toFixed(2)} hours`,
        system: `${(os.uptime() / 60 / 60).toFixed(2)} hours`
      },
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime.toFixed(2)}ms`
    };
    
    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
    
    // Log health check results if not healthy
    if (overallStatus !== 'healthy') {
      logger.warn('Health check returned non-healthy status', { healthStatus });
    }
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  healthCheckMiddleware,
  checkDatabaseHealth,
  checkRedisHealth,
  checkSystemHealth
}; 