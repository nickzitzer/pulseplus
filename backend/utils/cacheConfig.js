/**
 * @module cacheConfig
 * @description Standardized cache configuration and invalidation patterns
 * @requires ./logger
 */

const { logger } = require('./logger');

/**
 * @constant {Object} CACHE_DURATIONS
 * @description Standard cache durations for different resource types
 */
const CACHE_DURATIONS = {
  // Short-lived caches (1 minute)
  SHORT: 60 * 1000,
  
  // Medium-lived caches (5 minutes)
  MEDIUM: 5 * 60 * 1000,
  
  // Long-lived caches (15 minutes)
  LONG: 15 * 60 * 1000,
  
  // Very long-lived caches (1 hour)
  VERY_LONG: 60 * 60 * 1000
};

/**
 * @constant {Object} CACHE_PATTERNS
 * @description Standard cache key patterns for different resources
 */
const CACHE_PATTERNS = {
  // User resource cache patterns
  USER: {
    SINGLE: (id) => `user-${id}`,
    LIST: (query = {}) => `users-${JSON.stringify(query)}`,
    PROFILE: (id) => `user-profile-${id}`,
    SETTINGS: (id) => `user-settings-${id}`
  },
  
  // Game resource cache patterns
  GAME: {
    SINGLE: (id) => `game-${id}`,
    LIST: (query = {}) => `games-${JSON.stringify(query)}`,
    LEADERBOARD: (timeframe = 'all') => `leaderboard-${timeframe}`
  },
  
  // Season resource cache patterns
  SEASON: {
    SINGLE: (id) => `season-${id}`,
    LIST: (query = {}) => `seasons-${JSON.stringify(query)}`,
    CURRENT: () => 'current-season',
    TIERS: (id) => `season-tiers-${id}`
  },
  
  // Social resource cache patterns
  SOCIAL: {
    FRIENDS: (userId) => `friends-${userId}`,
    FRIEND_REQUESTS: (userId) => `friend-requests-${userId}`,
    TEAMS: (query = {}) => `teams-${JSON.stringify(query)}`,
    TEAM: (id) => `team-${id}`
  },
  
  // Economy resource cache patterns
  ECONOMY: {
    BALANCE: (userId) => `balance-${userId}`,
    TRANSACTIONS: (userId, query = {}) => `transactions-${userId}-${JSON.stringify(query)}`,
    SHOP: (id) => `shop-${id}`,
    SHOPS: () => 'shops'
  }
};

/**
 * @constant {Object} CACHE_CLEAR_PATTERNS
 * @description Standard cache invalidation patterns for different operations
 */
const CACHE_CLEAR_PATTERNS = {
  // User resource cache invalidation patterns
  USER: {
    CREATE: () => ['users-*'],
    UPDATE: (id) => [`user-${id}`, `user-profile-${id}`, `user-settings-${id}`, 'users-*'],
    DELETE: (id) => [`user-${id}`, `user-profile-${id}`, `user-settings-${id}`, 'users-*']
  },
  
  // Game resource cache invalidation patterns
  GAME: {
    CREATE: () => ['games-*'],
    UPDATE: (id) => [`game-${id}`, 'games-*', 'leaderboard-*'],
    DELETE: (id) => [`game-${id}`, 'games-*', 'leaderboard-*']
  },
  
  // Season resource cache invalidation patterns
  SEASON: {
    CREATE: () => ['seasons-*', 'current-season'],
    UPDATE: (id) => [`season-${id}`, `season-tiers-${id}`, 'seasons-*', 'current-season'],
    DELETE: (id) => [`season-${id}`, `season-tiers-${id}`, 'seasons-*']
  },
  
  // Social resource cache invalidation patterns
  SOCIAL: {
    FRIEND_REQUEST: (userId, targetId) => [
      `friends-${userId}`,
      `friends-${targetId}`,
      `friend-requests-${userId}`,
      `friend-requests-${targetId}`
    ],
    TEAM_UPDATE: (teamId, memberIds = []) => [
      `team-${teamId}`,
      'teams-*',
      ...memberIds.map(id => `friends-${id}`)
    ]
  },
  
  // Economy resource cache invalidation patterns
  ECONOMY: {
    TRANSACTION: (userId, targetId = null) => [
      `balance-${userId}`,
      `transactions-${userId}-*`,
      ...(targetId ? [`balance-${targetId}`, `transactions-${targetId}-*`] : [])
    ],
    SHOP_UPDATE: (shopId) => [`shop-${shopId}`, 'shops']
  }
};

/**
 * @function clearResourceCache
 * @description Clear cache for a resource based on operation and IDs
 * @param {Object} cacheManager - Cache manager instance
 * @param {string} cacheName - Cache name to clear
 * @param {string} resource - Resource type (USER, GAME, etc.)
 * @param {string} operation - Operation type (CREATE, UPDATE, etc.)
 * @param {string|Array} ids - Resource ID(s) affected
 * @returns {void}
 */
const clearResourceCache = (cacheManager, cacheName, resource, operation, ids) => {
  if (!CACHE_CLEAR_PATTERNS[resource] || !CACHE_CLEAR_PATTERNS[resource][operation]) {
    logger.warn(`No cache clear pattern found for ${resource}.${operation}`);
    return;
  }
  
  const patterns = CACHE_CLEAR_PATTERNS[resource][operation](ids);
  
  patterns.forEach(pattern => {
    cacheManager.clear(cacheName, pattern);
    logger.info(`Cleared cache: ${cacheName} with pattern ${pattern}`);
  });
};

/**
 * @function getCacheKey
 * @description Get a standardized cache key for a resource
 * @param {string} resource - Resource type (USER, GAME, etc.)
 * @param {string} pattern - Pattern type (SINGLE, LIST, etc.)
 * @param {*} params - Parameters for the pattern
 * @returns {string} Cache key
 */
const getCacheKey = (resource, pattern, params) => {
  if (!CACHE_PATTERNS[resource] || !CACHE_PATTERNS[resource][pattern]) {
    logger.warn(`No cache pattern found for ${resource}.${pattern}`);
    return `${resource.toLowerCase()}-${pattern.toLowerCase()}-${JSON.stringify(params)}`;
  }
  
  return CACHE_PATTERNS[resource][pattern](params);
};

/**
 * @function getCacheDuration
 * @description Get a standardized cache duration for a resource
 * @param {string} resource - Resource type (USER, GAME, etc.)
 * @param {string} pattern - Pattern type (SINGLE, LIST, etc.)
 * @returns {number} Cache duration in milliseconds
 */
const getCacheDuration = (resource, pattern) => {
  // Define resource-specific durations
  const resourceDurations = {
    USER: {
      SINGLE: CACHE_DURATIONS.MEDIUM,
      LIST: CACHE_DURATIONS.SHORT,
      PROFILE: CACHE_DURATIONS.MEDIUM,
      SETTINGS: CACHE_DURATIONS.MEDIUM
    },
    GAME: {
      SINGLE: CACHE_DURATIONS.MEDIUM,
      LIST: CACHE_DURATIONS.SHORT,
      LEADERBOARD: CACHE_DURATIONS.SHORT
    },
    SEASON: {
      SINGLE: CACHE_DURATIONS.MEDIUM,
      LIST: CACHE_DURATIONS.MEDIUM,
      CURRENT: CACHE_DURATIONS.SHORT,
      TIERS: CACHE_DURATIONS.MEDIUM
    },
    SOCIAL: {
      FRIENDS: CACHE_DURATIONS.MEDIUM,
      FRIEND_REQUESTS: CACHE_DURATIONS.SHORT,
      TEAMS: CACHE_DURATIONS.MEDIUM,
      TEAM: CACHE_DURATIONS.MEDIUM
    },
    ECONOMY: {
      BALANCE: CACHE_DURATIONS.SHORT,
      TRANSACTIONS: CACHE_DURATIONS.MEDIUM,
      SHOP: CACHE_DURATIONS.LONG,
      SHOPS: CACHE_DURATIONS.LONG
    }
  };
  
  // Return resource-specific duration if available
  if (resourceDurations[resource] && resourceDurations[resource][pattern]) {
    return resourceDurations[resource][pattern];
  }
  
  // Default to medium duration
  return CACHE_DURATIONS.MEDIUM;
};

module.exports = {
  CACHE_DURATIONS,
  CACHE_PATTERNS,
  CACHE_CLEAR_PATTERNS,
  clearResourceCache,
  getCacheKey,
  getCacheDuration
}; 