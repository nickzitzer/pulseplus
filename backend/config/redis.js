/**
 * @module redisConfig
 * @description Redis client configuration and connection management
 * @requires ioredis
 * @requires ../utils/configFactory
 * @requires ../utils/logger
 */

const Redis = require('ioredis');
const ConfigFactory = require('../utils/configFactory');
const { logger } = require('../utils/logger');

// Create standardized Redis configuration
const redisConfig = ConfigFactory.createRedisConfig({
  // Additional Redis options
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
  lazyConnect: false
});

/**
 * @constant {Redis.RedisClient} redisClient
 * @description Configured Redis client instance
 * @throws {Error} If Redis connection fails
 */
const redisClient = new Redis(redisConfig);

// Add event listeners for connection management
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('error', (err) => {
  logger.error(`Redis client error: ${err.message}`, { error: err });
});

redisClient.on('close', () => {
  logger.warn('Redis client connection closed');
});

redisClient.on('reconnecting', (delay) => {
  logger.info(`Redis client reconnecting in ${delay}ms`);
});

// Add health check method
redisClient.healthCheck = async () => {
  try {
    const result = await redisClient.ping();
    return { healthy: result === 'PONG' };
  } catch (error) {
    logger.error(`Redis health check failed: ${error.message}`, { error });
    return { healthy: false, error: error.message };
  }
};

// Add metrics collection
setInterval(async () => {
  try {
    const info = await redisClient.info();
    const metrics = {};
    
    // Parse Redis INFO command output
    info.split('\r\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        metrics[parts[0]] = parts[1];
      }
    });
    
    logger.debug('Redis metrics collected', { metrics });
    
    // Here you could send metrics to a monitoring system
    // e.g., prometheus.gauge('redis_connected_clients').set(metrics.connected_clients);
  } catch (error) {
    logger.error(`Failed to collect Redis metrics: ${error.message}`);
  }
}, 60000); // Collect metrics every minute

module.exports = redisClient; 