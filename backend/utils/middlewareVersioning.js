/**
 * @module middlewareVersioning
 * @description Utilities for tracking middleware versions and changes
 * @requires ../utils/logger
 */

const { logger } = require('./logger');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * @typedef {Object} MiddlewareVersion
 * @property {string} name - Middleware name
 * @property {string} version - Version hash
 * @property {Date} lastUpdated - Last update timestamp
 * @property {string} [description] - Optional description of the middleware
 */

// Store for middleware versions
const middlewareVersions = new Map();

// Path to version history file
const versionHistoryPath = path.join(__dirname, '../data/middleware-versions.json');

/**
 * @function loadVersionHistory
 * @description Loads middleware version history from file
 * @returns {Promise<void>}
 */
async function loadVersionHistory() {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(versionHistoryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create file if it doesn't exist
    if (!fs.existsSync(versionHistoryPath)) {
      fs.writeFileSync(versionHistoryPath, JSON.stringify([], null, 2));
      return;
    }
    
    const data = fs.readFileSync(versionHistoryPath, 'utf8');
    const versions = JSON.parse(data);
    
    versions.forEach(version => {
      middlewareVersions.set(version.name, {
        ...version,
        lastUpdated: new Date(version.lastUpdated)
      });
    });
    
    logger.info(`Loaded ${middlewareVersions.size} middleware versions from history`);
  } catch (error) {
    logger.error('Failed to load middleware version history', { error });
  }
}

/**
 * @function saveVersionHistory
 * @description Saves middleware version history to file
 * @returns {Promise<void>}
 */
async function saveVersionHistory() {
  try {
    const versions = Array.from(middlewareVersions.values());
    fs.writeFileSync(versionHistoryPath, JSON.stringify(versions, null, 2));
    logger.info(`Saved ${versions.length} middleware versions to history`);
  } catch (error) {
    logger.error('Failed to save middleware version history', { error });
  }
}

/**
 * @function generateVersionHash
 * @description Generates a version hash for a middleware function
 * @param {Function} middleware - Middleware function
 * @returns {string} Version hash
 */
function generateVersionHash(middleware) {
  const functionString = middleware.toString();
  return crypto.createHash('sha256').update(functionString).digest('hex').substring(0, 8);
}

/**
 * @function registerMiddleware
 * @description Registers a middleware with version tracking
 * @param {Function} middleware - Middleware function
 * @param {string} name - Middleware name
 * @param {Object} [options] - Registration options
 * @param {string} [options.description] - Middleware description
 * @returns {Function} Original middleware function
 * 
 * @example
 * // Register a middleware
 * const authMiddleware = registerMiddleware(
 *   (req, res, next) => {
 *     // Authentication logic
 *     next();
 *   },
 *   'authentication',
 *   { description: 'JWT authentication middleware' }
 * );
 * 
 * app.use(authMiddleware);
 */
function registerMiddleware(middleware, name, options = {}) {
  const version = generateVersionHash(middleware);
  const existing = middlewareVersions.get(name);
  
  if (!existing || existing.version !== version) {
    const versionInfo = {
      name,
      version,
      lastUpdated: new Date(),
      description: options.description || ''
    };
    
    middlewareVersions.set(name, versionInfo);
    saveVersionHistory();
    
    if (existing) {
      logger.info(`Middleware '${name}' updated`, {
        previousVersion: existing.version,
        newVersion: version
      });
    } else {
      logger.info(`Middleware '${name}' registered`, { version });
    }
  }
  
  return middleware;
}

/**
 * @function getMiddlewareVersions
 * @description Gets all registered middleware versions
 * @returns {MiddlewareVersion[]} Array of middleware versions
 */
function getMiddlewareVersions() {
  return Array.from(middlewareVersions.values());
}

/**
 * @function getMiddlewareVersion
 * @description Gets version information for a specific middleware
 * @param {string} name - Middleware name
 * @returns {MiddlewareVersion|null} Middleware version or null if not found
 */
function getMiddlewareVersion(name) {
  return middlewareVersions.get(name) || null;
}

// Load version history on module initialization
loadVersionHistory();

module.exports = {
  registerMiddleware,
  getMiddlewareVersions,
  getMiddlewareVersion
}; 