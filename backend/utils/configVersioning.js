/**
 * @module configVersioning
 * @description Tracks and manages configuration versions and changes
 * @requires fs
 * @requires path
 * @requires crypto
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('./logger');

/**
 * @class ConfigVersioning
 * @description Manages configuration versioning and change tracking
 */
class ConfigVersioning {
  /**
   * @constructor
   * @description Initialize the configuration versioning system
   * @param {Object} options - Configuration options
   * @param {string} options.storageDir - Directory to store version history
   * @param {boolean} options.enabled - Whether versioning is enabled
   * @param {string[]} options.sensitiveKeys - Keys to mask in version history
   */
  constructor(options = {}) {
    this.options = {
      storageDir: options.storageDir || path.join(process.cwd(), 'config-versions'),
      enabled: options.enabled !== false,
      sensitiveKeys: options.sensitiveKeys || [
        'password', 'secret', 'key', 'token', 'pass', 'auth'
      ]
    };
    
    // Create storage directory if it doesn't exist
    if (this.options.enabled && !fs.existsSync(this.options.storageDir)) {
      fs.mkdirSync(this.options.storageDir, { recursive: true });
    }
  }
  
  /**
   * @method _generateVersionId
   * @description Generate a unique version ID for a configuration
   * @param {Object} config - Configuration object
   * @returns {string} Version ID (hash of configuration)
   * @private
   */
  _generateVersionId(config) {
    const configStr = JSON.stringify(this._maskSensitiveValues(config));
    return crypto.createHash('sha256').update(configStr).digest('hex');
  }
  
  /**
   * @method _maskSensitiveValues
   * @description Mask sensitive values in configuration for storage
   * @param {Object} config - Configuration object
   * @returns {Object} Configuration with masked sensitive values
   * @private
   */
  _maskSensitiveValues(config) {
    const maskedConfig = JSON.parse(JSON.stringify(config));
    
    const maskObject = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        // Check if key contains any sensitive keywords
        const isSensitive = this.options.sensitiveKeys.some(
          sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase())
        );
        
        if (isSensitive && typeof obj[key] === 'string') {
          obj[key] = '***MASKED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          maskObject(obj[key]);
        }
      });
    };
    
    maskObject(maskedConfig);
    return maskedConfig;
  }
  
  /**
   * @method saveVersion
   * @description Save a new configuration version
   * @param {Object} config - Configuration object
   * @param {Object} metadata - Additional metadata about the version
   * @returns {Object} Version information
   */
  saveVersion(config, metadata = {}) {
    if (!this.options.enabled) {
      logger.debug('Configuration versioning is disabled');
      return null;
    }
    
    try {
      // Generate version ID
      const versionId = this._generateVersionId(config);
      
      // Create version metadata
      const versionInfo = {
        versionId,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        hostname: require('os').hostname(),
        ...metadata
      };
      
      // Create masked config for storage
      const maskedConfig = this._maskSensitiveValues(config);
      
      // Create version data
      const versionData = {
        ...versionInfo,
        config: maskedConfig
      };
      
      // Save version to file
      const versionFile = path.join(this.options.storageDir, `${versionId}.json`);
      fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
      
      // Update version index
      this._updateVersionIndex(versionInfo);
      
      logger.info(`Configuration version ${versionId} saved`);
      return versionInfo;
    } catch (error) {
      logger.error(`Failed to save configuration version: ${error.message}`);
      return null;
    }
  }
  
  /**
   * @method _updateVersionIndex
   * @description Update the version index file with new version
   * @param {Object} versionInfo - Version information
   * @private
   */
  _updateVersionIndex(versionInfo) {
    const indexFile = path.join(this.options.storageDir, 'index.json');
    let index = [];
    
    // Load existing index if it exists
    if (fs.existsSync(indexFile)) {
      try {
        index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      } catch (error) {
        logger.error(`Failed to parse version index: ${error.message}`);
      }
    }
    
    // Add new version to index
    index.unshift(versionInfo);
    
    // Keep only the last 100 versions in the index
    if (index.length > 100) {
      index = index.slice(0, 100);
    }
    
    // Save updated index
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  }
  
  /**
   * @method getVersionHistory
   * @description Get the version history
   * @param {number} limit - Maximum number of versions to return
   * @returns {Array} Version history
   */
  getVersionHistory(limit = 10) {
    if (!this.options.enabled) {
      logger.debug('Configuration versioning is disabled');
      return [];
    }
    
    try {
      const indexFile = path.join(this.options.storageDir, 'index.json');
      
      if (!fs.existsSync(indexFile)) {
        return [];
      }
      
      const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      return index.slice(0, limit);
    } catch (error) {
      logger.error(`Failed to get version history: ${error.message}`);
      return [];
    }
  }
  
  /**
   * @method getVersion
   * @description Get a specific configuration version
   * @param {string} versionId - Version ID to retrieve
   * @returns {Object} Version data
   */
  getVersion(versionId) {
    if (!this.options.enabled) {
      logger.debug('Configuration versioning is disabled');
      return null;
    }
    
    try {
      const versionFile = path.join(this.options.storageDir, `${versionId}.json`);
      
      if (!fs.existsSync(versionFile)) {
        logger.warn(`Version ${versionId} not found`);
        return null;
      }
      
      return JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    } catch (error) {
      logger.error(`Failed to get version ${versionId}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * @method compareVersions
   * @description Compare two configuration versions
   * @param {string} versionId1 - First version ID
   * @param {string} versionId2 - Second version ID
   * @returns {Object} Differences between versions
   */
  compareVersions(versionId1, versionId2) {
    if (!this.options.enabled) {
      logger.debug('Configuration versioning is disabled');
      return null;
    }
    
    try {
      const version1 = this.getVersion(versionId1);
      const version2 = this.getVersion(versionId2);
      
      if (!version1 || !version2) {
        return null;
      }
      
      // Simple diff implementation
      const diff = {
        versionInfo: {
          version1: {
            versionId: version1.versionId,
            timestamp: version1.timestamp,
            environment: version1.environment
          },
          version2: {
            versionId: version2.versionId,
            timestamp: version2.timestamp,
            environment: version2.environment
          }
        },
        changes: this._diffObjects(version1.config, version2.config)
      };
      
      return diff;
    } catch (error) {
      logger.error(`Failed to compare versions: ${error.message}`);
      return null;
    }
  }
  
  /**
   * @method _diffObjects
   * @description Find differences between two objects
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {Object} Differences between objects
   * @private
   */
  _diffObjects(obj1, obj2) {
    const diff = {};
    
    // Find keys in obj1 that are different or missing in obj2
    Object.keys(obj1).forEach(key => {
      // If key doesn't exist in obj2
      if (!(key in obj2)) {
        diff[key] = { 
          type: 'removed',
          oldValue: obj1[key]
        };
        return;
      }
      
      // If values are different
      if (typeof obj1[key] === 'object' && obj1[key] !== null && 
          typeof obj2[key] === 'object' && obj2[key] !== null) {
        // Recursively diff objects
        const nestedDiff = this._diffObjects(obj1[key], obj2[key]);
        if (Object.keys(nestedDiff).length > 0) {
          diff[key] = { 
            type: 'changed',
            changes: nestedDiff
          };
        }
      } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        diff[key] = { 
          type: 'changed',
          oldValue: obj1[key],
          newValue: obj2[key]
        };
      }
    });
    
    // Find keys in obj2 that don't exist in obj1
    Object.keys(obj2).forEach(key => {
      if (!(key in obj1)) {
        diff[key] = { 
          type: 'added',
          newValue: obj2[key]
        };
      }
    });
    
    return diff;
  }
}

module.exports = ConfigVersioning; 