/**
 * @module apiKeyRotationService
 * @description Service for scheduled API key rotation
 * @requires ./index
 * @requires ../logger
 */

const apiKeyManager = require('./index');
const { logger } = require('../logger');

/**
 * @class ApiKeyRotationService
 * @description Manages scheduled API key rotation
 */
class ApiKeyRotationService {
  /**
   * @constructor
   * @param {Object} options - Configuration options
   * @param {Object} options.services - Map of service names to rotation handlers
   * @param {number} options.checkInterval - Interval in milliseconds to check for rotation
   */
  constructor(options = {}) {
    this.services = options.services || {};
    this.checkInterval = options.checkInterval || 24 * 60 * 60 * 1000; // 24 hours default
    this.rotationInterval = options.rotationInterval || 30 * 24 * 60 * 60 * 1000; // 30 days default
    this.isRunning = false;
    this.timer = null;
  }

  /**
   * @function registerService
   * @description Register a service for API key rotation
   * @param {string} serviceName - Name of the service
   * @param {Object} config - Service configuration
   * @param {Function} config.generateNewKey - Function to generate a new API key
   * @param {Function} config.updateService - Function to update the service with the new key
   * @param {number} [config.rotationInterval] - Custom rotation interval for this service
   * @returns {void}
   */
  registerService(serviceName, config) {
    this.services[serviceName] = {
      generateNewKey: config.generateNewKey,
      updateService: config.updateService,
      rotationInterval: config.rotationInterval || this.rotationInterval
    };
    
    logger.info(`Registered service ${serviceName} for API key rotation`);
  }

  /**
   * @function start
   * @description Start the API key rotation service
   * @returns {void}
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.checkForRotation();
    this.timer = setInterval(() => this.checkForRotation(), this.checkInterval);
    
    logger.info('API key rotation service started');
  }

  /**
   * @function stop
   * @description Stop the API key rotation service
   * @returns {void}
   */
  stop() {
    if (!this.isRunning) return;
    
    clearInterval(this.timer);
    this.timer = null;
    this.isRunning = false;
    
    logger.info('API key rotation service stopped');
  }

  /**
   * @async
   * @function checkForRotation
   * @description Check if any API keys need rotation
   * @returns {Promise<void>}
   */
  async checkForRotation() {
    logger.info('Checking for API keys that need rotation');
    
    for (const [serviceName, config] of Object.entries(this.services)) {
      try {
        const metadata = await apiKeyManager.getApiKeyMetadata(serviceName);
        
        // Skip if no rotation date is available (new key)
        if (metadata.rotatedAt === 'unknown') {
          logger.info(`Service ${serviceName} has no rotation date, skipping`);
          continue;
        }
        
        const rotatedAt = new Date(metadata.rotatedAt).getTime();
        const now = Date.now();
        
        // Check if key is due for rotation
        if (now - rotatedAt >= config.rotationInterval) {
          logger.info(`API key for ${serviceName} is due for rotation`);
          await this.rotateServiceKey(serviceName);
        } else {
          const daysUntilRotation = Math.ceil((rotatedAt + config.rotationInterval - now) / (24 * 60 * 60 * 1000));
          logger.info(`API key for ${serviceName} will be rotated in ${daysUntilRotation} days`);
        }
      } catch (error) {
        logger.error(`Error checking rotation for ${serviceName}: ${error.message}`);
      }
    }
  }

  /**
   * @async
   * @function rotateServiceKey
   * @description Rotate the API key for a specific service
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object>} Result of rotation
   * @throws {Error} If rotation fails
   */
  async rotateServiceKey(serviceName) {
    const serviceConfig = this.services[serviceName];
    
    if (!serviceConfig) {
      throw new Error(`Service ${serviceName} is not registered for rotation`);
    }
    
    try {
      logger.info(`Starting API key rotation for ${serviceName}`);
      
      // Generate new API key
      const newApiKey = await serviceConfig.generateNewKey();
      
      // Rotate the key in Secrets Manager
      await apiKeyManager.rotateApiKey(serviceName, newApiKey);
      
      // Update the service with the new key
      await serviceConfig.updateService(newApiKey);
      
      logger.info(`API key rotation completed for ${serviceName}`);
      
      return {
        success: true,
        service: serviceName,
        rotatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`API key rotation failed for ${serviceName}: ${error.message}`);
      throw new Error(`API key rotation failed for ${serviceName}: ${error.message}`);
    }
  }

  /**
   * @async
   * @function forceRotateAll
   * @description Force rotation of all registered service API keys
   * @returns {Promise<Object>} Results of rotation
   */
  async forceRotateAll() {
    const results = {
      success: [],
      failed: []
    };
    
    for (const serviceName of Object.keys(this.services)) {
      try {
        await this.rotateServiceKey(serviceName);
        results.success.push(serviceName);
      } catch (error) {
        results.failed.push({
          service: serviceName,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = new ApiKeyRotationService(); 