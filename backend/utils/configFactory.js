/**
 * @module configFactory
 * @description Factory for creating standardized component configurations
 * @requires ./logger
 */

const { logger } = require('./logger');
let config = null;

// Load config asynchronously
const configPromise = require('../config');
configPromise.then(loadedConfig => {
  config = loadedConfig;
}).catch(err => {
  logger.error(`Failed to load config: ${err.message}`);
});

/**
 * @class ConfigFactory
 * @description Factory for creating standardized component configurations
 */
class ConfigFactory {
  /**
   * @method createDatabaseConfig
   * @description Create a standardized database configuration
   * @param {Object} options - Additional database options
   * @returns {Object} Standardized database configuration
   */
  static createDatabaseConfig(options = {}) {
    // If config is not loaded yet, use environment variables directly
    if (!config) {
      return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        // Connection pool settings
        max: options.maxConnections || 20,
        min: options.minConnections || 2,
        idleTimeoutMillis: options.idleTimeout || 30000,
        connectionTimeoutMillis: options.connectionTimeout || 2000,
        allowExitOnIdle: options.allowExitOnIdle !== false,
        // Additional options
        ...options
      };
    }

    return {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl_enabled ? {
        rejectUnauthorized: config.db.ssl_reject_unauthorized,
        ca: config.db.ssl_ca_path,
        key: config.db.ssl_key_path,
        cert: config.db.ssl_cert_path
      } : undefined,
      // Connection pool settings
      max: options.maxConnections || 20,
      min: options.minConnections || 2,
      idleTimeoutMillis: options.idleTimeout || 30000,
      connectionTimeoutMillis: options.connectionTimeout || 2000,
      allowExitOnIdle: options.allowExitOnIdle !== false,
      // Additional options
      ...options
    };
  }
  
  /**
   * @method createRedisConfig
   * @description Create a standardized Redis configuration
   * @param {Object} options - Additional Redis options
   * @returns {Object} Standardized Redis configuration
   */
  static createRedisConfig(options = {}) {
    // If config is not loaded yet, use environment variables directly
    if (!config) {
      return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        // Default Redis options
        retryStrategy: (times) => Math.min(times * 100, 3000),
        maxRetriesPerRequest: options.maxRetriesPerRequest || 3,
        enableReadyCheck: options.enableReadyCheck !== false,
        // Additional options
        ...options
      };
    }

    return {
      url: config.redis.url,
      port: config.redis.port,
      password: config.redis.password,
      // Default Redis options
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: options.maxRetriesPerRequest || 3,
      enableReadyCheck: options.enableReadyCheck !== false,
      // Additional options
      ...options
    };
  }
  
  /**
   * @method createEmailConfig
   * @description Create a standardized email configuration
   * @param {Object} options - Additional email options
   * @returns {Object} Standardized email configuration
   */
  static createEmailConfig(options = {}) {
    // If config is not loaded yet, use environment variables directly
    if (!config) {
      return {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        // Default email options
        secure: options.secure !== undefined ? options.secure : (parseInt(process.env.SMTP_PORT) === 465),
        tls: {
          rejectUnauthorized: options.rejectUnauthorized !== false
        },
        // Additional options
        ...options
      };
    }

    return {
      host: config.email.host,
      port: config.email.port,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      },
      // Default email options
      secure: options.secure !== undefined ? options.secure : (config.email.port === 465),
      tls: {
        rejectUnauthorized: options.rejectUnauthorized !== false
      },
      // Additional options
      ...options
    };
  }
  
  /**
   * @method createCacheConfig
   * @description Create a standardized cache configuration
   * @param {string} cacheType - Type of cache (memory, redis)
   * @param {Object} options - Additional cache options
   * @returns {Object} Standardized cache configuration
   */
  static createCacheConfig(cacheType = 'memory', options = {}) {
    const cacheConfigs = {
      memory: {
        type: 'memory',
        max: options.max || 1000,
        ttl: options.ttl || 60 * 1000, // 1 minute
        allowStale: options.allowStale !== false
      },
      redis: {
        type: 'redis',
        ...ConfigFactory.createRedisConfig(options.redis || {}),
        ttl: options.ttl || 60 * 1000, // 1 minute
        keyPrefix: options.keyPrefix || 'cache:'
      }
    };
    
    return cacheConfigs[cacheType] || cacheConfigs.memory;
  }
  
  /**
   * @method createLoggerConfig
   * @description Create a standardized logger configuration
   * @param {string} category - Logger category
   * @param {Object} options - Additional logger options
   * @returns {Object} Standardized logger configuration
   */
  static createLoggerConfig(category, options = {}) {
    const environment = process.env.NODE_ENV || 'development';
    
    // Default log levels by environment
    const defaultLevels = {
      development: 'debug',
      test: 'info',
      staging: 'info',
      production: 'warn'
    };
    
    return {
      category: category || 'default',
      level: options.level || defaultLevels[environment] || 'info',
      format: options.format || 'json',
      timestamp: options.timestamp !== false,
      colorize: options.colorize !== false && environment === 'development',
      // Additional options
      ...options
    };
  }
  
  /**
   * @method createSecurityConfig
   * @description Create a standardized security configuration
   * @param {Object} options - Additional security options
   * @returns {Object} Standardized security configuration
   */
  static createSecurityConfig(options = {}) {
    // If config is not loaded yet, use environment variables directly
    if (!config) {
      return {
        jwt: {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRES_IN || '1d'
        },
        cors: {
          origin: options.corsOrigin || '*',
          methods: options.corsMethods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          allowedHeaders: options.corsHeaders || ['Content-Type', 'Authorization'],
          credentials: options.corsCredentials !== false
        },
        rateLimit: {
          windowMs: options.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
          max: options.rateLimitMax || 100, // 100 requests per windowMs
          standardHeaders: options.rateLimitHeaders !== false,
          legacyHeaders: false
        },
        helmet: {
          contentSecurityPolicy: options.csp !== false,
          xssFilter: options.xssFilter !== false,
          hsts: options.hsts !== false,
          frameguard: options.frameguard !== false,
          noSniff: options.noSniff !== false,
          referrerPolicy: options.referrerPolicy !== false,
          permittedCrossDomainPolicies: options.permittedCrossDomainPolicies !== false,
          dnsPrefetchControl: options.dnsPrefetchControl !== false,
          expectCt: options.expectCt !== false,
          crossOriginEmbedderPolicy: options.crossOriginEmbedderPolicy !== false,
          crossOriginOpenerPolicy: options.crossOriginOpenerPolicy !== false,
          crossOriginResourcePolicy: options.crossOriginResourcePolicy !== false,
          originAgentCluster: options.originAgentCluster !== false,
          upgradeInsecureRequests: options.upgradeInsecureRequests !== false
        },
        // Additional options
        ...options
      };
    }

    return {
      jwt: {
        secret: config.jwt.secret,
        expiresIn: config.jwt.expiresIn
      },
      cors: {
        origin: options.corsOrigin || '*',
        methods: options.corsMethods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: options.corsHeaders || ['Content-Type', 'Authorization'],
        credentials: options.corsCredentials !== false
      },
      rateLimit: {
        windowMs: options.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
        max: options.rateLimitMax || 100, // 100 requests per windowMs
        standardHeaders: options.rateLimitHeaders !== false,
        legacyHeaders: false
      },
      helmet: {
        contentSecurityPolicy: options.csp !== false,
        xssFilter: options.xssFilter !== false,
        hsts: options.hsts !== false,
        frameguard: options.frameguard !== false,
        noSniff: options.noSniff !== false,
        referrerPolicy: options.referrerPolicy !== false,
        permittedCrossDomainPolicies: options.permittedCrossDomainPolicies !== false,
        dnsPrefetchControl: options.dnsPrefetchControl !== false,
        expectCt: options.expectCt !== false,
        crossOriginEmbedderPolicy: options.crossOriginEmbedderPolicy !== false,
        crossOriginOpenerPolicy: options.crossOriginOpenerPolicy !== false,
        crossOriginResourcePolicy: options.crossOriginResourcePolicy !== false,
        originAgentCluster: options.originAgentCluster !== false,
        upgradeInsecureRequests: options.upgradeInsecureRequests !== false
      },
      // Additional options
      ...options
    };
  }
}

module.exports = ConfigFactory; 