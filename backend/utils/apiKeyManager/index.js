/**
 * @module apiKeyManager
 * @description Manages API keys for external services with secure storage and rotation
 * @requires aws-sdk
 * @requires ../logger
 */

const AWS = require('aws-sdk');
const { logger } = require('../logger');

/**
 * @class ApiKeyManager
 * @description Manages API keys for external services with secure storage and rotation
 */
class ApiKeyManager {
  /**
   * @constructor
   * @param {Object} options - Configuration options
   * @param {string} options.region - AWS region
   * @param {string} options.secretPrefix - Prefix for secret names
   */
  constructor(options = {}) {
    this.region = options.region || process.env.AWS_REGION || 'us-east-1';
    this.secretPrefix = options.secretPrefix || 'pulseplus/api-keys';
    this.secretsManager = new AWS.SecretsManager({ region: this.region });
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * @async
   * @function getApiKey
   * @description Get an API key for a service
   * @param {string} serviceName - Name of the service
   * @param {string} [keyType='current'] - Key type (current or previous)
   * @returns {Promise<string>} API key
   * @throws {Error} If API key cannot be retrieved
   */
  async getApiKey(serviceName, keyType = 'current') {
    const cacheKey = `${serviceName}:${keyType}`;
    
    // Check cache first
    const cachedItem = this.cache.get(cacheKey);
    if (cachedItem && cachedItem.expiresAt > Date.now()) {
      return cachedItem.value;
    }
    
    // Retrieve from Secrets Manager
    const secretId = `${this.secretPrefix}/${serviceName}`;
    
    try {
      const data = await this.secretsManager.getSecretValue({ SecretId: secretId }).promise();
      let secretValue;
      
      if ('SecretString' in data) {
        secretValue = JSON.parse(data.SecretString);
      } else {
        const buff = Buffer.from(data.SecretBinary, 'base64');
        secretValue = JSON.parse(buff.toString('ascii'));
      }
      
      // Cache the result
      this.cache.set(cacheKey, {
        value: secretValue[keyType],
        expiresAt: Date.now() + this.cacheTTL
      });
      
      return secretValue[keyType];
    } catch (error) {
      logger.error(`Failed to retrieve API key for ${serviceName}: ${error.message}`);
      
      // Fall back to environment variable in development only
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        const envVarName = `${serviceName.toUpperCase()}_API_KEY`;
        if (process.env[envVarName]) {
          logger.warn(`Using environment variable ${envVarName} for API key in ${process.env.NODE_ENV} environment`);
          return process.env[envVarName];
        }
      }
      
      throw new Error(`Unable to retrieve API key for ${serviceName}`);
    }
  }

  /**
   * @async
   * @function rotateApiKey
   * @description Rotate an API key for a service
   * @param {string} serviceName - Name of the service
   * @param {string} newApiKey - New API key
   * @returns {Promise<Object>} Result of rotation
   * @throws {Error} If API key rotation fails
   */
  async rotateApiKey(serviceName, newApiKey) {
    const secretId = `${this.secretPrefix}/${serviceName}`;
    
    try {
      // Get current secret
      let currentSecret;
      try {
        const data = await this.secretsManager.getSecretValue({ SecretId: secretId }).promise();
        if ('SecretString' in data) {
          currentSecret = JSON.parse(data.SecretString);
        } else {
          const buff = Buffer.from(data.SecretBinary, 'base64');
          currentSecret = JSON.parse(buff.toString('ascii'));
        }
      } catch (error) {
        // If secret doesn't exist, create a new one
        if (error.code === 'ResourceNotFoundException') {
          currentSecret = { current: '', previous: '' };
        } else {
          throw error;
        }
      }
      
      // Rotate keys: current becomes previous, new becomes current
      const updatedSecret = {
        current: newApiKey,
        previous: currentSecret.current,
        rotatedAt: new Date().toISOString(),
        service: serviceName
      };
      
      // Update secret in Secrets Manager
      await this.secretsManager.putSecretValue({
        SecretId: secretId,
        SecretString: JSON.stringify(updatedSecret)
      }).promise();
      
      // Clear cache
      this.cache.delete(`${serviceName}:current`);
      this.cache.delete(`${serviceName}:previous`);
      
      logger.info(`API key rotated for ${serviceName}`);
      return {
        success: true,
        service: serviceName,
        rotatedAt: updatedSecret.rotatedAt
      };
    } catch (error) {
      logger.error(`Failed to rotate API key for ${serviceName}: ${error.message}`);
      throw new Error(`API key rotation failed for ${serviceName}: ${error.message}`);
    }
  }

  /**
   * @async
   * @function getApiKeyMetadata
   * @description Get metadata about an API key
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object>} API key metadata
   * @throws {Error} If metadata cannot be retrieved
   */
  async getApiKeyMetadata(serviceName) {
    const secretId = `${this.secretPrefix}/${serviceName}`;
    
    try {
      const data = await this.secretsManager.describeSecret({ SecretId: secretId }).promise();
      const secretValue = await this.secretsManager.getSecretValue({ SecretId: secretId }).promise();
      
      let parsedValue;
      if ('SecretString' in secretValue) {
        parsedValue = JSON.parse(secretValue.SecretString);
      } else {
        const buff = Buffer.from(secretValue.SecretBinary, 'base64');
        parsedValue = JSON.parse(buff.toString('ascii'));
      }
      
      return {
        service: serviceName,
        rotatedAt: parsedValue.rotatedAt || 'unknown',
        createdAt: data.CreatedDate,
        lastUpdated: data.LastChangedDate,
        hasCurrentKey: !!parsedValue.current,
        hasPreviousKey: !!parsedValue.previous
      };
    } catch (error) {
      logger.error(`Failed to retrieve API key metadata for ${serviceName}: ${error.message}`);
      throw new Error(`Unable to retrieve API key metadata for ${serviceName}`);
    }
  }

  /**
   * @async
   * @function listApiKeys
   * @description List all API keys managed by this service
   * @returns {Promise<Array>} List of API key metadata
   * @throws {Error} If listing fails
   */
  async listApiKeys() {
    try {
      const data = await this.secretsManager.listSecrets({
        Filters: [
          {
            Key: 'name',
            Values: [this.secretPrefix]
          }
        ]
      }).promise();
      
      const results = [];
      for (const secret of data.SecretList) {
        const serviceName = secret.Name.replace(`${this.secretPrefix}/`, '');
        try {
          const metadata = await this.getApiKeyMetadata(serviceName);
          results.push(metadata);
        } catch (error) {
          logger.warn(`Could not retrieve metadata for ${serviceName}: ${error.message}`);
          results.push({
            service: serviceName,
            error: 'Metadata unavailable'
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error(`Failed to list API keys: ${error.message}`);
      throw new Error(`Unable to list API keys: ${error.message}`);
    }
  }
}

module.exports = new ApiKeyManager(); 