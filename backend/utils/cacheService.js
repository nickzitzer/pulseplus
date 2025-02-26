/**
 * @module cacheService
 * @description Manages in-memory caching with TTL support and pattern-based cache clearing
 * @requires ./configFactory
 * @requires ./logger
 */

const ConfigFactory = require('./configFactory');
const { logger } = require('./logger');

/**
 * @class CacheManager
 * @description Manages in-memory caching with TTL support and pattern-based cache clearing
 * @classdesc Provides a flexible caching system with multiple named caches and configurable TTL
 */
class CacheManager {
  /**
   * @constructor
   * @param {Object} [options] - Cache configuration options
   */
  constructor(options = {}) {
    // Get standardized cache configuration
    const cacheConfig = ConfigFactory.createCacheConfig(
      options.type || 'memory',
      options
    );
    
    this.caches = new Map();
    this.defaultTTL = cacheConfig.ttl || 300000; // 5 minutes default
    this.maxSize = cacheConfig.max || 1000;
    this.allowStale = cacheConfig.allowStale !== false;
    this.keyPrefix = cacheConfig.keyPrefix || '';
    this.type = cacheConfig.type;
    
    logger.info(`Cache service initialized with type: ${this.type}`, {
      ttl: this.defaultTTL,
      maxSize: this.maxSize
    });
  }

  /**
   * @method get
   * @description Retrieve a value from the cache
   * @param {string} cacheName - Name of the cache to access
   * @param {string} key - Key to lookup
   * @returns {*} Cached value or null if not found/expired
   */
  get(cacheName, key) {
    const prefixedKey = this._getPrefixedKey(key);
    
    if (!this.caches.has(cacheName)) return null;
    const cache = this.caches.get(cacheName);
    const entry = cache.get(prefixedKey);
    
    if (!entry) {
      logger.debug(`Cache miss: ${cacheName}/${prefixedKey}`);
      return null;
    }
    
    if (Date.now() > entry.expires) {
      if (!this.allowStale) {
        cache.delete(prefixedKey);
        logger.debug(`Cache expired: ${cacheName}/${prefixedKey}`);
        return null;
      }
      // If stale values are allowed, mark as stale but return anyway
      entry.stale = true;
    }
    
    logger.debug(`Cache hit: ${cacheName}/${prefixedKey}`);
    return entry.value;
  }

  /**
   * @method set
   * @description Store a value in the cache
   * @param {string} cacheName - Name of the cache to access
   * @param {string} key - Key to store the value under
   * @param {*} value - Value to cache
   * @param {number} [ttl] - Time To Live in milliseconds
   */
  set(cacheName, key, value, ttl = this.defaultTTL) {
    const prefixedKey = this._getPrefixedKey(key);
    
    if (!this.caches.has(cacheName)) {
      this.caches.set(cacheName, new Map());
    }
    
    const cache = this.caches.get(cacheName);
    
    // Check if we need to evict entries due to size constraints
    if (cache.size >= this.maxSize) {
      this._evictOldest(cache);
    }
    
    cache.set(prefixedKey, {
      value,
      expires: Date.now() + ttl,
      created: Date.now(),
      stale: false
    });
    
    logger.debug(`Cache set: ${cacheName}/${prefixedKey}`, { ttl });
  }

  /**
   * @method delete
   * @description Remove a specific key from the cache
   * @param {string} cacheName - Name of the cache to access
   * @param {string} key - Key to remove
   * @returns {boolean} True if key was found and removed
   */
  delete(cacheName, key) {
    const prefixedKey = this._getPrefixedKey(key);
    
    if (this.caches.has(cacheName)) {
      const result = this.caches.get(cacheName).delete(prefixedKey);
      if (result) {
        logger.debug(`Cache delete: ${cacheName}/${prefixedKey}`);
      }
      return result;
    }
    return false;
  }

  /**
   * @method clear
   * @description Clear all entries in a cache or those matching a pattern
   * @param {string} cacheName - Name of the cache to clear
   * @param {string} [pattern] - Optional regex pattern for selective clearing
   */
  clear(cacheName, pattern = null) {
    if (!this.caches.has(cacheName)) return;

    const cache = this.caches.get(cacheName);
    if (!pattern) {
      cache.clear();
      logger.info(`Cache cleared: ${cacheName}`);
      return;
    }

    // Escape special regex characters
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedPattern);
    let clearedCount = 0;
    
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
        clearedCount++;
      }
    }
    
    logger.info(`Cache pattern cleared: ${cacheName}/${pattern}`, { clearedCount });
  }

  /**
   * @method getCacheStats
   * @description Get statistics about a specific cache
   * @param {string} cacheName - Name of the cache to analyze
   * @returns {Object|null} Cache statistics or null if cache doesn't exist
   */
  getCacheStats(cacheName) {
    if (!this.caches.has(cacheName)) return null;
    
    const cache = this.caches.get(cacheName);
    const stats = {
      size: cache.size,
      keys: Array.from(cache.keys()),
      type: this.type,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL
    };
    
    logger.debug(`Cache stats retrieved for ${cacheName}`, { size: stats.size });
    return stats;
  }

  /**
   * @method flushAll
   * @description Clear all caches
   */
  flushAll() {
    this.caches.forEach(cache => cache.clear());
    logger.info('All caches flushed');
  }

  /**
   * @method generateKey
   * @description Generate a cache key from prefix and identifiers
   * @param {string} prefix - Key prefix
   * @param {...string} identifiers - Additional identifiers to append
   * @returns {string} Generated cache key
   */
  generateKey(prefix, ...identifiers) {
    return `${prefix}-${identifiers.join('-')}`;
  }
  
  /**
   * @private
   * @method _getPrefixedKey
   * @description Add the configured key prefix to a cache key
   * @param {string} key - Original key
   * @returns {string} Prefixed key
   */
  _getPrefixedKey(key) {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
  }
  
  /**
   * @private
   * @method _evictOldest
   * @description Evict the oldest entries when cache is full
   * @param {Map} cache - Cache to evict from
   */
  _evictOldest(cache) {
    // Find the oldest 10% of entries
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].created - b[1].created)
      .slice(0, Math.max(1, Math.floor(cache.size * 0.1)));
    
    // Delete the oldest entries
    for (const [key] of entries) {
      cache.delete(key);
    }
    
    logger.debug(`Cache eviction: removed ${entries.length} oldest entries`);
  }
}

// Create cache configuration from environment variables
const cacheOptions = {
  type: process.env.CACHE_TYPE || 'memory',
  ttl: parseInt(process.env.CACHE_DEFAULT_TTL) || 300000,
  max: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
  allowStale: process.env.CACHE_ALLOW_STALE === 'true',
  keyPrefix: process.env.CACHE_KEY_PREFIX || ''
};

// Singleton instance
const cacheManager = new CacheManager(cacheOptions);

/**
 * @constant {Object} CACHE_NAMES
 * @description Enumeration of available cache categories
 * @readonly
 * @property {string} SOCIAL - Social features cache
 * @property {string} ECONOMY - Economy features cache
 * @property {string} GAME - Game features cache
 * @property {string} USER - User features cache
 * @property {string} SEASON - Season features cache
 */
const CACHE_NAMES = {
  SOCIAL: 'social',
  ECONOMY: 'economy',
  GAME: 'game',
  USER: 'user',
  SEASON: 'season'
};

// Export configured instance
module.exports = {
  cacheManager,
  CACHE_NAMES
}; 