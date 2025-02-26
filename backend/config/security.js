/**
 * @module securityConfig
 * @description Centralized security configuration for the application
 * @requires helmet
 * @requires cors
 * @requires express-rate-limit
 * @requires ../utils/configFactory
 * @requires ../utils/logger
 */

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const ConfigFactory = require('../utils/configFactory');
const { logger } = require('../utils/logger');
const RedisStore = require('rate-limit-redis');
const redisClient = require('./redis');

// Create a Redis store adapter for rate-limit-redis to work with ioredis
const redisStoreAdapter = {
  client: redisClient,
  prefix: 'rateLimit:',
  // Add the missing sendCommand method that rate-limit-redis expects
  sendCommand: (...args) => {
    return redisClient.call(...args);
  }
};

/**
 * @function getSecurityConfig
 * @description Get standardized security configuration
 * @param {Object} options - Security configuration options
 * @returns {Object} Security configuration object
 */
function getSecurityConfig(options = {}) {
  // Get standardized security configuration from factory
  return ConfigFactory.createSecurityConfig(options);
}

/**
 * @function configureHelmet
 * @description Configure Helmet middleware with standardized settings
 * @param {Object} options - Helmet configuration options
 * @returns {Function} Configured Helmet middleware
 */
function configureHelmet(options = {}) {
  const securityConfig = getSecurityConfig(options);
  
  const helmetOptions = {
    contentSecurityPolicy: securityConfig.helmet.contentSecurityPolicy ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", options.scriptSrc || "'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", options.styleSrc || '', "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", options.imgSrc || '', "https://*.amazonaws.com"],
        connectSrc: ["'self'", options.connectSrc || '', "https://*.amazonaws.com", "https://*.execute-api.*.amazonaws.com"],
        fontSrc: ["'self'", options.fontSrc || '', "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https://*.amazonaws.com"],
        frameSrc: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        upgradeInsecureRequests: securityConfig.helmet.upgradeInsecureRequests !== false && process.env.NODE_ENV === 'production' ? [] : null
      }
    } : false,
    xssFilter: securityConfig.helmet.xssFilter,
    hsts: securityConfig.helmet.hsts ? {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true
    } : false,
    frameguard: securityConfig.helmet.frameguard ? {
      action: 'deny'
    } : false,
    noSniff: securityConfig.helmet.noSniff,
    referrerPolicy: securityConfig.helmet.referrerPolicy ? {
      policy: 'strict-origin-when-cross-origin'
    } : false,
    permittedCrossDomainPolicies: securityConfig.helmet.permittedCrossDomainPolicies ? {
      permittedPolicies: 'none'
    } : false,
    dnsPrefetchControl: securityConfig.helmet.dnsPrefetchControl ? {
      allow: false
    } : false,
    expectCt: securityConfig.helmet.expectCt && process.env.NODE_ENV === 'production' ? {
      maxAge: 86400, // 1 day in seconds
      enforce: true
    } : false,
    crossOriginEmbedderPolicy: securityConfig.helmet.crossOriginEmbedderPolicy !== false && process.env.NODE_ENV === 'production',
    crossOriginOpenerPolicy: securityConfig.helmet.crossOriginOpenerPolicy !== false && process.env.NODE_ENV === 'production' ? {
      policy: 'same-origin'
    } : false,
    crossOriginResourcePolicy: securityConfig.helmet.crossOriginResourcePolicy !== false ? {
      policy: 'same-origin'
    } : false,
    originAgentCluster: securityConfig.helmet.originAgentCluster !== false
  };
  
  logger.info('Enhanced Helmet security configuration applied', {
    csp: !!helmetOptions.contentSecurityPolicy,
    xssFilter: helmetOptions.xssFilter,
    hsts: !!helmetOptions.hsts,
    frameguard: !!helmetOptions.frameguard,
    noSniff: helmetOptions.noSniff,
    referrerPolicy: !!helmetOptions.referrerPolicy,
    permittedCrossDomainPolicies: !!helmetOptions.permittedCrossDomainPolicies,
    dnsPrefetchControl: !!helmetOptions.dnsPrefetchControl,
    expectCt: !!helmetOptions.expectCt,
    crossOriginEmbedderPolicy: !!helmetOptions.crossOriginEmbedderPolicy,
    crossOriginOpenerPolicy: !!helmetOptions.crossOriginOpenerPolicy,
    crossOriginResourcePolicy: !!helmetOptions.crossOriginResourcePolicy,
    originAgentCluster: !!helmetOptions.originAgentCluster
  });
  
  return helmet(helmetOptions);
}

/**
 * @function configureCors
 * @description Configure CORS middleware with standardized settings
 * @param {Object} options - CORS configuration options
 * @returns {Function} Configured CORS middleware
 */
function configureCors(options = {}) {
  const securityConfig = getSecurityConfig(options);
  
  const corsOptions = {
    origin: securityConfig.cors.origin,
    methods: securityConfig.cors.methods,
    allowedHeaders: securityConfig.cors.allowedHeaders,
    credentials: securityConfig.cors.credentials,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
  };
  
  logger.info('CORS configuration applied', {
    origin: typeof corsOptions.origin === 'function' ? 'function' : corsOptions.origin,
    credentials: corsOptions.credentials
  });
  
  return cors(corsOptions);
}

/**
 * @function configureRateLimit
 * @description Configure rate limiting middleware with standardized settings
 * @param {Object} options - Rate limiting configuration options
 * @returns {Function} Configured rate limiting middleware
 */
function configureRateLimit(options = {}) {
  const securityConfig = getSecurityConfig(options);
  
  // Temporarily disable Redis store for rate limiting to fix the compatibility issue
  // const store = redisClient ? new RedisStore({
  //   client: redisStoreAdapter,
  //   prefix: 'rateLimit:'
  // }) : undefined;
  const store = undefined;
  
  const rateLimitOptions = {
    windowMs: securityConfig.rateLimit.windowMs,
    max: securityConfig.rateLimit.max,
    standardHeaders: securityConfig.rateLimit.standardHeaders,
    legacyHeaders: securityConfig.rateLimit.legacyHeaders,
    store,
    message: {
      status: 429,
      message: 'Too many requests, please try again later.'
    },
    skip: (req) => {
      // Skip rate limiting for health check endpoints
      return req.path === '/health' || req.path === '/metrics';
    }
  };
  
  logger.info('Rate limiting configuration applied', {
    windowMs: rateLimitOptions.windowMs,
    max: rateLimitOptions.max,
    usingRedis: !!store
  });
  
  return rateLimit(rateLimitOptions);
}

/**
 * @constant {Object} securityMiddleware
 * @description Configured security middleware functions
 * @property {Function} helmet - Configured Helmet middleware
 * @property {Function} cors - Configured CORS middleware
 * @property {Function} rateLimit - Configured rate limiting middleware
 */
const securityMiddleware = {
  helmet: configureHelmet(),
  cors: configureCors(),
  rateLimit: configureRateLimit()
};

module.exports = {
  getSecurityConfig,
  configureHelmet,
  configureCors,
  configureRateLimit,
  securityMiddleware
}; 