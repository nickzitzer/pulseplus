/**
 * @module websocketConfig
 * @description Configuration for WebSocket connections and rate limiting
 * @requires ../utils/configFactory
 * @requires ../utils/logger
 */

const ConfigFactory = require('../utils/configFactory');
const { logger } = require('../utils/logger');

/**
 * @function getWebSocketConfig
 * @description Get standardized WebSocket configuration
 * @param {Object} options - WebSocket configuration options
 * @returns {Object} WebSocket configuration object
 */
function getWebSocketConfig(options = {}) {
  // Get standardized WebSocket configuration from factory
  return ConfigFactory.createWebSocketConfig(options);
}

/**
 * @constant {Object} defaultConfig
 * @description Default WebSocket configuration
 */
const defaultConfig = {
  // General WebSocket settings
  path: '/socket.io',
  serveClient: false,
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  
  // Connection settings
  connectionTimeout: 45000, // 45 seconds
  pingInterval: 25000, // 25 seconds
  pingTimeout: 20000, // 20 seconds
  
  // Rate limiting settings
  rateLimit: {
    // Connection rate limiting
    connection: {
      enabled: true,
      maxConnections: process.env.WS_MAX_CONNECTIONS || 60, // 60 connections per window
      windowMs: process.env.WS_CONNECTION_WINDOW_MS || 60 * 1000 // 1 minute
    },
    
    // Message rate limiting
    message: {
      enabled: true,
      maxMessages: process.env.WS_MAX_MESSAGES || 120, // 120 messages per window
      windowMs: process.env.WS_MESSAGE_WINDOW_MS || 60 * 1000 // 1 minute
    }
  },
  
  // Redis adapter settings (for horizontal scaling)
  redis: {
    enabled: !!process.env.REDIS_URL,
    url: process.env.REDIS_URL
  }
};

/**
 * @function configureWebSocket
 * @description Configure Socket.IO with standardized settings
 * @param {Object} io - Socket.IO server instance
 * @param {Object} options - Configuration options
 * @returns {Object} Configured Socket.IO instance
 */
function configureWebSocket(io, options = {}) {
  const config = { ...defaultConfig, ...options };
  
  // Apply general settings
  io.path(config.path);
  
  // Apply adapter settings
  if (config.redis.enabled) {
    try {
      const redisAdapter = require('@socket.io/redis-adapter');
      const Redis = require('ioredis');
      
      const pubClient = new Redis(config.redis.url);
      const subClient = pubClient.duplicate();
      
      io.adapter(redisAdapter(pubClient, subClient));
      
      logger.info('Redis adapter configured for Socket.IO');
    } catch (error) {
      logger.error(`Failed to configure Redis adapter: ${error.message}`);
    }
  }
  
  // Apply rate limiting configuration to the WebSocket rate limiter
  try {
    const websocketRateLimiter = require('../utils/websocketRateLimiter');
    
    websocketRateLimiter.maxConnections = config.rateLimit.connection.maxConnections;
    websocketRateLimiter.connectionWindow = config.rateLimit.connection.windowMs;
    websocketRateLimiter.maxMessages = config.rateLimit.message.maxMessages;
    websocketRateLimiter.messageWindow = config.rateLimit.message.windowMs;
    
    logger.info('WebSocket rate limiting configured', {
      connectionLimit: websocketRateLimiter.maxConnections,
      connectionWindow: websocketRateLimiter.connectionWindow,
      messageLimit: websocketRateLimiter.maxMessages,
      messageWindow: websocketRateLimiter.messageWindow
    });
  } catch (error) {
    logger.error(`Failed to configure WebSocket rate limiter: ${error.message}`);
  }
  
  return io;
}

module.exports = {
  getWebSocketConfig,
  configureWebSocket,
  defaultConfig
}; 