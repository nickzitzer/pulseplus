/**
 * @module config
 * @description Configuration management module that loads and validates environment variables
 * @requires dotenv
 */

require('dotenv').config();

/**
 * @constant {Object} config
 * @description Application configuration object with validated environment variables
 * 
 * @property {Object} db - Database configuration
 * @property {string} db.host - Database host
 * @property {number} db.port - Database port
 * @property {string} db.database - Database name
 * @property {string} db.user - Database user
 * @property {string} db.password - Database password
 * 
 * @property {Object} redis - Redis configuration
 * @property {string} redis.url - Redis connection URL
 * @property {number} redis.port - Redis port
 * 
 * @property {Object} jwt - JWT configuration
 * @property {string} jwt.secret - JWT signing secret
 * @property {string} jwt.expiresIn - JWT expiration time
 * 
 * @property {Object} email - Email service configuration
 * @property {string} email.host - SMTP host
 * @property {number} email.port - SMTP port
 * @property {string} email.user - SMTP user
 * @property {string} email.pass - SMTP password
 * 
 * @throws {Error} If required environment variables are missing
 */
const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

/**
 * @constant {string[]} requiredVars
 * @description List of required environment variables that must be present
 * @private
 */
const requiredVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = requiredVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = config; 