/**
 * @module websocketRateLimiter
 * @description Rate limiting for WebSocket connections and messages
 * @requires redis
 */

const redisClient = require('../config/redis');
const { logger } = require('./logger');

/**
 * @class WebSocketRateLimiter
 * @description Manages rate limiting for WebSocket connections and messages
 */
class WebSocketRateLimiter {
  /**
   * @constructor
   * @param {Object} options - Configuration options
   * @param {number} options.maxConnections - Maximum connections per IP in the time window
   * @param {number} options.maxMessages - Maximum messages per connection in the time window
   * @param {number} options.connectionWindow - Time window for connection limiting in milliseconds
   * @param {number} options.messageWindow - Time window for message limiting in milliseconds
   * @param {boolean} options.useRedis - Whether to use Redis for rate limiting (falls back to in-memory if false)
   */
  constructor(options = {}) {
    this.maxConnections = options.maxConnections || 60; // 60 connections per window
    this.maxMessages = options.maxMessages || 120; // 120 messages per window
    this.connectionWindow = options.connectionWindow || 60 * 1000; // 1 minute
    this.messageWindow = options.messageWindow || 60 * 1000; // 1 minute
    this.useRedis = options.useRedis && redisClient ? true : false;
    
    // In-memory storage as fallback when Redis is not available
    this.connectionStore = new Map();
    this.messageStore = new Map();
    
    // Clean up in-memory stores periodically
    if (!this.useRedis) {
      setInterval(() => this.cleanupStores(), Math.max(this.connectionWindow, this.messageWindow));
    }
    
    logger.info('WebSocket rate limiter initialized', {
      maxConnections: this.maxConnections,
      maxMessages: this.maxMessages,
      connectionWindow: this.connectionWindow,
      messageWindow: this.messageWindow,
      useRedis: this.useRedis
    });
  }
  
  /**
   * @private
   * @function cleanupStores
   * @description Clean up expired entries from in-memory stores
   */
  cleanupStores() {
    const now = Date.now();
    
    // Clean connection store
    for (const [key, data] of this.connectionStore.entries()) {
      if (now - data.timestamp > this.connectionWindow) {
        this.connectionStore.delete(key);
      }
    }
    
    // Clean message store
    for (const [key, data] of this.messageStore.entries()) {
      if (now - data.timestamp > this.messageWindow) {
        this.messageStore.delete(key);
      }
    }
  }
  
  /**
   * @async
   * @function checkConnectionLimit
   * @description Check if an IP has exceeded the connection rate limit
   * @param {string} ip - Client IP address
   * @returns {Promise<boolean>} True if limit is not exceeded, false otherwise
   */
  async checkConnectionLimit(ip) {
    if (this.useRedis) {
      return this.checkConnectionLimitRedis(ip);
    } else {
      return this.checkConnectionLimitMemory(ip);
    }
  }
  
  /**
   * @private
   * @async
   * @function checkConnectionLimitRedis
   * @description Check connection limit using Redis
   * @param {string} ip - Client IP address
   * @returns {Promise<boolean>} True if limit is not exceeded, false otherwise
   */
  async checkConnectionLimitRedis(ip) {
    const key = `wsratelimit:conn:${ip}`;
    
    try {
      // Increment counter
      const count = await redisClient.incr(key);
      
      // Set expiration if this is a new key
      if (count === 1) {
        await redisClient.pexpire(key, this.connectionWindow);
      }
      
      // Check if limit is exceeded
      if (count > this.maxConnections) {
        logger.warn(`WebSocket connection rate limit exceeded for IP: ${ip}`, {
          count,
          limit: this.maxConnections
        });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error(`Redis error in connection rate limiting: ${error.message}`);
      // Fallback to in-memory if Redis fails
      return this.checkConnectionLimitMemory(ip);
    }
  }
  
  /**
   * @private
   * @function checkConnectionLimitMemory
   * @description Check connection limit using in-memory store
   * @param {string} ip - Client IP address
   * @returns {boolean} True if limit is not exceeded, false otherwise
   */
  checkConnectionLimitMemory(ip) {
    const now = Date.now();
    const data = this.connectionStore.get(ip) || { count: 0, timestamp: now };
    
    // Reset counter if window has passed
    if (now - data.timestamp > this.connectionWindow) {
      data.count = 0;
      data.timestamp = now;
    }
    
    // Increment counter
    data.count += 1;
    this.connectionStore.set(ip, data);
    
    // Check if limit is exceeded
    if (data.count > this.maxConnections) {
      logger.warn(`WebSocket connection rate limit exceeded for IP: ${ip}`, {
        count: data.count,
        limit: this.maxConnections
      });
      return false;
    }
    
    return true;
  }
  
  /**
   * @async
   * @function checkMessageLimit
   * @description Check if a socket has exceeded the message rate limit
   * @param {string} socketId - Socket ID
   * @returns {Promise<boolean>} True if limit is not exceeded, false otherwise
   */
  async checkMessageLimit(socketId) {
    if (this.useRedis) {
      return this.checkMessageLimitRedis(socketId);
    } else {
      return this.checkMessageLimitMemory(socketId);
    }
  }
  
  /**
   * @private
   * @async
   * @function checkMessageLimitRedis
   * @description Check message limit using Redis
   * @param {string} socketId - Socket ID
   * @returns {Promise<boolean>} True if limit is not exceeded, false otherwise
   */
  async checkMessageLimitRedis(socketId) {
    const key = `wsratelimit:msg:${socketId}`;
    
    try {
      // Increment counter
      const count = await redisClient.incr(key);
      
      // Set expiration if this is a new key
      if (count === 1) {
        await redisClient.pexpire(key, this.messageWindow);
      }
      
      // Check if limit is exceeded
      if (count > this.maxMessages) {
        logger.warn(`WebSocket message rate limit exceeded for socket: ${socketId}`, {
          count,
          limit: this.maxMessages
        });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error(`Redis error in message rate limiting: ${error.message}`);
      // Fallback to in-memory if Redis fails
      return this.checkMessageLimitMemory(socketId);
    }
  }
  
  /**
   * @private
   * @function checkMessageLimitMemory
   * @description Check message limit using in-memory store
   * @param {string} socketId - Socket ID
   * @returns {boolean} True if limit is not exceeded, false otherwise
   */
  checkMessageLimitMemory(socketId) {
    const now = Date.now();
    const data = this.messageStore.get(socketId) || { count: 0, timestamp: now };
    
    // Reset counter if window has passed
    if (now - data.timestamp > this.messageWindow) {
      data.count = 0;
      data.timestamp = now;
    }
    
    // Increment counter
    data.count += 1;
    this.messageStore.set(socketId, data);
    
    // Check if limit is exceeded
    if (data.count > this.maxMessages) {
      logger.warn(`WebSocket message rate limit exceeded for socket: ${socketId}`, {
        count: data.count,
        limit: this.maxMessages
      });
      return false;
    }
    
    return true;
  }
  
  /**
   * @function createConnectionLimiter
   * @description Creates a middleware function for limiting WebSocket connections
   * @returns {Function} Socket.IO middleware function
   * 
   * @example
   * io.use(websocketRateLimiter.createConnectionLimiter());
   */
  createConnectionLimiter() {
    return async (socket, next) => {
      try {
        const ip = socket.handshake.address;
        const allowed = await this.checkConnectionLimit(ip);
        
        if (!allowed) {
          return next(new Error('Connection rate limit exceeded'));
        }
        
        next();
      } catch (error) {
        logger.error(`Error in WebSocket connection rate limiting: ${error.message}`);
        next(); // Allow connection on error to prevent service disruption
      }
    };
  }
  
  /**
   * @function createMessageLimiter
   * @description Creates an event handler wrapper for limiting WebSocket messages
   * @returns {Function} Function that wraps Socket.IO event handlers
   * 
   * @example
   * const wrapWithRateLimit = websocketRateLimiter.createMessageLimiter();
   * socket.on('message', wrapWithRateLimit(async (data) => {
   *   // Handle message
   * }));
   */
  createMessageLimiter() {
    return (handler) => {
      return async (data, callback) => {
        try {
          const socket = this;
          const allowed = await this.rateLimiter.checkMessageLimit(socket.id);
          
          if (!allowed) {
            if (typeof callback === 'function') {
              callback({ error: 'Message rate limit exceeded' });
            }
            return;
          }
          
          await handler.call(socket, data, callback);
        } catch (error) {
          logger.error(`Error in WebSocket message rate limiting: ${error.message}`);
          if (typeof callback === 'function') {
            callback({ error: 'Internal server error' });
          }
        }
      };
    };
  }
}

// Create default instance with standard settings
const websocketRateLimiter = new WebSocketRateLimiter({
  useRedis: !!redisClient
});

module.exports = websocketRateLimiter; 