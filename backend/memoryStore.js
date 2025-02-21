/**
 * @module memoryStore
 * @description In-memory storage implementation with automatic cleanup for rate limiting and temporary data storage
 */

/**
 * @class MemoryStore
 * @description Manages in-memory storage with TTL support and automatic cleanup
 * @classdesc Provides a simple in-memory storage solution with automatic expiration of entries.
 * Can be used as a fallback store for rate limiting when Redis is not available.
 */
class MemoryStore {
  /**
   * @constructor
   * @description Initializes the memory store and sets up cleanup interval
   */
  constructor() {
    /**
     * @private
     * @type {Map<string, Object>}
     * @description Internal storage using Map for key-value pairs
     */
    this.store = new Map();

    /**
     * @private
     * @type {NodeJS.Timeout}
     * @description Interval timer for cleanup of expired entries
     */
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.expiresAt <= now) this.store.delete(key);
      }
    }, 60 * 1000); // Cleanup every minute
  }

  /**
   * @async
   * @function increment
   * @description Increments the counter for a key within a time window
   * @param {string} key - The key to increment
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Promise<number>} Current count for the key
   * 
   * @example
   * const count = await memoryStore.increment('rate-limit:user123', 60000);
   * if (count > maxLimit) {
   *   // Rate limit exceeded
   * }
   */
  async increment(key, windowMs) {
    const entry = this.store.get(key) || { count: 0, expiresAt: Date.now() + windowMs };
    entry.count++;
    this.store.set(key, entry);
    return entry.count;
  }

  /**
   * @async
   * @function get
   * @description Retrieves the current count for a key
   * @param {string} key - The key to look up
   * @returns {Promise<number>} Current count for the key, or 0 if not found
   * 
   * @example
   * const currentCount = await memoryStore.get('rate-limit:user123');
   */
  async get(key) {
    return this.store.get(key)?.count || 0;
  }

  /**
   * @async
   * @function reset
   * @description Resets the counter for a key by removing it from the store
   * @param {string} key - The key to reset
   * @returns {Promise<void>}
   * 
   * @example
   * await memoryStore.reset('rate-limit:user123');
   */
  async reset(key) {
    this.store.delete(key);
  }
}

// Export singleton instance
module.exports = new MemoryStore();
