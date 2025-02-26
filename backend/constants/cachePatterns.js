/**
 * @module CachePatterns
 * @description Re-exports cache patterns from utils/cacheConfig.js
 */

const { CACHE_PATTERNS, CACHE_CLEAR_PATTERNS } = require('../utils/cacheConfig');

module.exports = {
  CACHE_PATTERNS,
  CACHE_CLEAR_PATTERNS
}; 