/**
 * @class CacheManager
 * @description Manages in-memory caching with TTL support and pattern-based cache clearing
 * @classdesc Provides a flexible caching system with multiple named caches and configurable TTL
 */
class CacheManager {
  /**
   * @constructor
   * @param {number} [defaultTTL=300000] - Default Time To Live in milliseconds (5 minutes)
   */
  constructor(defaultTTL = 300000) { // 5 minutes default
    this.caches = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * @method get
   * @description Retrieve a value from the cache
   * @param {string} cacheName - Name of the cache to access
   * @param {string} key - Key to lookup
   * @returns {*} Cached value or null if not found/expired
   */
  get(cacheName, key) {
    if (!this.caches.has(cacheName)) return null;
    const cache = this.caches.get(cacheName);
    const entry = cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      cache.delete(key);
      return null;
    }
    
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
    if (!this.caches.has(cacheName)) {
      this.caches.set(cacheName, new Map());
    }
    
    const cache = this.caches.get(cacheName);
    cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  /**
   * @method delete
   * @description Remove a specific key from the cache
   * @param {string} cacheName - Name of the cache to access
   * @param {string} key - Key to remove
   * @returns {boolean} True if key was found and removed
   */
  delete(cacheName, key) {
    if (this.caches.has(cacheName)) {
      return this.caches.get(cacheName).delete(key);
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
      return;
    }

    // Escape special regex characters
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedPattern);
    
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
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
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
      hits: 0, // Could implement hit tracking if needed
      misses: 0
    };
  }

  /**
   * @method flushAll
   * @description Clear all caches
   */
  flushAll() {
    this.caches.forEach(cache => cache.clear());
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
}

// Singleton instance
const cacheManager = new CacheManager();

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