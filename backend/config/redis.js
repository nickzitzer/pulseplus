/**
 * @module redisConfig
 * @description Redis client configuration and connection management
 * @requires redis
 */

const Redis = require('redis');

/**
 * @typedef {Object} RetryOptions
 * @property {Error} [error] - Connection error if any
 * @property {number} total_retry_time - Total time spent retrying
 * @property {number} attempt - Current attempt number
 */

/**
 * @constant {Object} redisConfig
 * @description Redis connection configuration object
 * @property {string} url - Redis connection URL
 * @property {Function} retry_strategy - Function to handle connection retries
 * @private
 */
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  /**
   * @function retry_strategy
   * @description Determines retry behavior for failed connections
   * @param {RetryOptions} options - Retry attempt information
   * @returns {Error|number} Error to stop retrying, or number of ms to wait
   * @private
   */
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis retry time exhausted');
    }
    return Math.min(options.attempt * 100, 3000);
  }
};

/**
 * @constant {Redis.RedisClient} redisClient
 * @description Configured Redis client instance
 * @throws {Error} If Redis connection fails
 */
const redisClient = Redis.createClient(redisConfig);

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

module.exports = redisClient; 