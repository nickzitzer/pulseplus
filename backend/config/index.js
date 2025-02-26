/**
 * @module config
 * @description Configuration management module that loads and validates environment variables
 * @requires dotenv
 * @requires ../utils/configEncryption
 * @requires ../utils/configValidator
 * @requires ../utils/configVersioning
 */

require('dotenv').config();
const ConfigEncryption = require('../utils/configEncryption');
const { ConfigValidator } = require('../utils/configValidator');
const ConfigVersioning = require('../utils/configVersioning');
const path = require('path');
const { logger } = require('../utils/logger');

// Add AWS SDK for Secrets Manager
const AWS = require('aws-sdk');

/**
 * @constant {ConfigEncryption} configEncryption
 * @description Configuration encryption utility instance
 */
let configEncryption = null;
// Only initialize encryption if it's enabled
if (process.env.CONFIG_ENCRYPTION_ENABLED === 'true') {
  configEncryption = new ConfigEncryption(
    process.env.CONFIG_MASTER_KEY_PATH || path.join(__dirname, '../../keys/master.key')
  );
}

/**
 * @constant {ConfigVersioning} configVersioning
 * @description Configuration versioning utility instance
 */
const configVersioning = new ConfigVersioning({
  storageDir: process.env.CONFIG_VERSIONS_DIR || path.join(__dirname, '../../config-versions'),
  enabled: process.env.CONFIG_VERSIONING_ENABLED === 'true'
});

/**
 * @function getSecureValue
 * @description Get a value, decrypting it if it's encrypted
 * @param {string} value - The value to process
 * @returns {string} The decrypted value or original value if not encrypted
 */
const getSecureValue = (value) => {
  if (!value) return value;
  if (!configEncryption || process.env.CONFIG_ENCRYPTION_ENABLED !== 'true') return value;
  return configEncryption.isEncrypted(value) ? configEncryption.decrypt(value) : value;
};

/**
 * @function getSecretFromSecretsManager
 * @description Retrieve a secret from AWS Secrets Manager
 * @param {string} secretId - The secret ID or ARN
 * @param {string} secretKey - The key within the secret JSON (optional)
 * @returns {Promise<string>} The secret value
 */
const getSecretFromSecretsManager = async (secretId, secretKey) => {
  try {
    const secretsManager = new AWS.SecretsManager({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    const data = await secretsManager.getSecretValue({ SecretId: secretId }).promise();
    let secretValue;
    
    if ('SecretString' in data) {
      secretValue = data.SecretString;
    } else {
      const buff = Buffer.from(data.SecretBinary, 'base64');
      secretValue = buff.toString('ascii');
    }
    
    if (secretKey) {
      const secretObject = JSON.parse(secretValue);
      return secretObject[secretKey];
    }
    
    return secretValue;
  } catch (error) {
    logger.error(`Failed to retrieve secret from Secrets Manager: ${error.message}`);
    throw error;
  }
};

/**
 * @function getJwtSecret
 * @description Get JWT secret from appropriate source based on environment
 * @returns {Promise<string>} The JWT secret
 */
const getJwtSecret = async () => {
  // In production or staging, retrieve from Secrets Manager only
  if (['production', 'staging'].includes(process.env.NODE_ENV)) {
    const secretId = process.env.JWT_SECRET_ID || process.env.DB_SECRET_ID;
    const secretKey = 'jwt_secret';
    
    if (!secretId) {
      throw new Error('JWT_SECRET_ID or DB_SECRET_ID must be provided in production/staging environments');
    }
    
    try {
      return await getSecretFromSecretsManager(secretId, secretKey);
    } catch (error) {
      logger.error(`Failed to retrieve JWT secret from Secrets Manager: ${error.message}`);
      throw new Error('Unable to retrieve JWT secret from Secrets Manager. Application cannot start securely.');
    }
  }
  
  // In development or test, use environment variable
  return getSecureValue(process.env.JWT_SECRET);
};

/**
 * @constant {Object} config
 * @description Application configuration object with validated environment variables
 * 
 * @property {Object} db - Database configuration
 * @property {string} db.host - Database host
 * @property {number} db.port - Database port
 * @property {string} db.database - Database name
 * @property {string} db.user - Database user
 * @property {string} db.password - Database password (encrypted)
 * @property {boolean} db.ssl_enabled - Whether SSL is enabled for database connections
 * @property {boolean} db.ssl_reject_unauthorized - Whether to reject unauthorized SSL connections
 * @property {string} db.ssl_ca_path - Path to SSL CA certificate
 * @property {string} db.ssl_key_path - Path to SSL key
 * @property {string} db.ssl_cert_path - Path to SSL certificate
 * 
 * @property {Object} redis - Redis configuration
 * @property {string} redis.url - Redis connection URL
 * @property {string} redis.password - Redis password (encrypted)
 * @property {number} redis.port - Redis port
 * 
 * @property {Object} jwt - JWT configuration
 * @property {string} jwt.secret - JWT signing secret (encrypted)
 * @property {string} jwt.expiresIn - JWT expiration time
 * 
 * @property {Object} email - Email service configuration
 * @property {string} email.host - SMTP host
 * @property {number} email.port - SMTP port
 * @property {string} email.user - SMTP user
 * @property {string} email.pass - SMTP password (encrypted)
 * 
 * @throws {Error} If required environment variables are missing
 */
const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: getSecureValue(process.env.DB_PASSWORD),
    ssl_enabled: process.env.DB_SSL_ENABLED === 'true',
    ssl_reject_unauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ssl_ca_path: process.env.DB_SSL_CA_PATH,
    ssl_key_path: process.env.DB_SSL_KEY_PATH,
    ssl_cert_path: process.env.DB_SSL_CERT_PATH
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: getSecureValue(process.env.REDIS_PASSWORD)
  },
  jwt: {
    secret: null, // Will be populated asynchronously
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: getSecureValue(process.env.SMTP_PASS)
  },
  encryption: {
    enabled: process.env.CONFIG_ENCRYPTION_ENABLED === 'true'
  },
  versioning: {
    enabled: process.env.CONFIG_VERSIONING_ENABLED === 'true',
    storageDir: process.env.CONFIG_VERSIONS_DIR || path.join(__dirname, '../../config-versions')
  }
};

/**
 * @constant {string[]} requiredVars
 * @description List of required environment variables that must be present
 * @private
 */
const requiredVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD'];

// In development, JWT_SECRET is required from environment variables
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
  requiredVars.push('JWT_SECRET');
} else {
  // In production/staging, JWT_SECRET_ID or DB_SECRET_ID must be present
  if (!process.env.JWT_SECRET_ID && !process.env.DB_SECRET_ID) {
    throw new Error('In production/staging environments, JWT_SECRET_ID or DB_SECRET_ID must be provided for secure secret management');
  }
}

const missing = requiredVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

/**
 * @function initializeConfig
 * @description Initialize configuration with async values
 * @returns {Promise<Object>} Initialized configuration
 */
const initializeConfig = async () => {
  try {
    // Populate async values
    config.jwt.secret = await getJwtSecret();
    
    // Validate configuration based on current environment
    const validatedConfig = ConfigValidator.validateEnvironment(config);
    
    // Log environment information
    logger.info(`Configuration loaded for environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (process.env.NODE_ENV === 'production') {
      logger.info('Running in PRODUCTION mode with enhanced security requirements');
    } else if (process.env.NODE_ENV === 'staging') {
      logger.info('Running in STAGING mode with standard security requirements');
    } else {
      logger.info(`Running in ${process.env.NODE_ENV || 'DEVELOPMENT'} mode`);
    }
    
    // Save configuration version
    if (validatedConfig.versioning.enabled) {
      const versionInfo = configVersioning.saveVersion(validatedConfig, {
        source: 'startup',
        user: process.env.USER || 'system'
      });
      
      if (versionInfo) {
        logger.info(`Configuration version ${versionInfo.versionId} saved`);
        
        // Add version info to the exported config
        validatedConfig.currentVersion = versionInfo.versionId;
      }
    }
    
    // Add utility methods to the config object
    validatedConfig.getVersionHistory = (limit) => configVersioning.getVersionHistory(limit);
    validatedConfig.getVersion = (versionId) => configVersioning.getVersion(versionId);
    validatedConfig.compareVersions = (v1, v2) => configVersioning.compareVersions(v1, v2);
    
    return validatedConfig;
  } catch (error) {
    logger.error(`Configuration initialization failed: ${error.message}`);
    throw error;
  }
};

// Export a promise that resolves to the initialized config
module.exports = (async () => {
  try {
    return await initializeConfig();
  } catch (error) {
    logger.error(`Configuration initialization failed: ${error.message}`);
    throw error;
  }
})(); 