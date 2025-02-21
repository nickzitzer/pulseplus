/**
 * @module cacheConfig
 * @description Configuration for application-wide caching, including durations, patterns, and key generation
 */

/**
 * @constant {Object} CACHE_DURATIONS
 * @description Standard cache durations (in milliseconds) for different resource types
 * 
 * @property {number} PROFILE - User profile cache duration (5 minutes)
 * @property {number} SESSIONS - User sessions cache duration (5 minutes)
 * @property {number} PREFERENCES - User preferences cache duration (5 minutes)
 * @property {number} FRIENDS - Friends list cache duration (5 minutes)
 * @property {number} TEAMS - Teams data cache duration (5 minutes)
 * @property {number} CHAT - Chat messages cache duration (2 minutes)
 * @property {number} BALANCE - User balance cache duration (2 minutes)
 * @property {number} SHOP - Shop items cache duration (15 minutes)
 * @property {number} INVENTORY - User inventory cache duration (5 minutes)
 * @property {number} LEADERBOARD - Leaderboard cache duration (5 minutes)
 * @property {number} SEASON - Season data cache duration (10 minutes)
 * @property {number} GAME_STATS - Game statistics cache duration (5 minutes)
 */
const CACHE_DURATIONS = {
  // User-related caches
  PROFILE: 5 * 60 * 1000, // 5 minutes
  SESSIONS: 5 * 60 * 1000, // 5 minutes
  PREFERENCES: 5 * 60 * 1000, // 5 minutes

  // Social-related caches
  FRIENDS: 5 * 60 * 1000, // 5 minutes
  TEAMS: 5 * 60 * 1000, // 5 minutes
  CHAT: 2 * 60 * 1000, // 2 minutes (more frequent updates)

  // Economy-related caches
  BALANCE: 2 * 60 * 1000, // 2 minutes (sensitive data)
  SHOP: 15 * 60 * 1000, // 15 minutes (less frequent updates)
  INVENTORY: 5 * 60 * 1000, // 5 minutes

  // Game-related caches
  LEADERBOARD: 5 * 60 * 1000, // 5 minutes
  SEASON: 10 * 60 * 1000, // 10 minutes
  GAME_STATS: 5 * 60 * 1000, // 5 minutes
};

/**
 * @function generateCacheKey
 * @description Generates a standardized cache key from a type and optional parameters
 * @param {string} type - The resource type (e.g., 'profile', 'friends')
 * @param {Object} [params] - Optional parameters to include in the key
 * @returns {string} The generated cache key
 * 
 * @example
 * // Generate a simple cache key
 * const key1 = generateCacheKey('profile');
 * // Returns: 'profile'
 * 
 * // Generate a cache key with parameters
 * const key2 = generateCacheKey('profile', { userId: '123' });
 * // Returns: 'profile-userId:123'
 */
const generateCacheKey = (type, params) => {
  if (!params) return type;
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('-');
  
  return `${type}-${sortedParams}`;
};

/**
 * @constant {Object} CACHE_PATTERNS
 * @description Functions to generate cache keys for different resource types
 * 
 * @property {Function} PROFILE - Generates cache key for user profile
 * @property {Function} FRIENDS - Generates cache key for user's friends list
 * @property {Function} BALANCE - Generates cache key for user's balance
 * @property {Function} SHOP - Generates cache key for shop items with filters
 * @property {Function} LEADERBOARD - Generates cache key for season leaderboard
 * @property {Function} TEAM - Generates cache key for team data
 * @property {Function} CHAT - Generates cache key for chat messages
 * @property {Function} SESSIONS - Generates cache key for user sessions
 * @property {Function} SEASON - Generates cache key for season data
 * @property {Function} GAME_STATS - Generates cache key for game statistics
 * 
 * @example
 * // Generate a profile cache key
 * const profileKey = CACHE_PATTERNS.PROFILE('user123');
 * 
 * // Generate a shop cache key with filters
 * const shopKey = CACHE_PATTERNS.SHOP('shop1', { category: 'weapons' });
 */
const CACHE_PATTERNS = {
  PROFILE: (userId) => generateCacheKey('profile', { userId }),
  FRIENDS: (userId) => generateCacheKey('friends', { userId }),
  BALANCE: (userId) => generateCacheKey('balance', { userId }),
  SHOP: (shopId, filters = {}) => generateCacheKey('shop', { shopId, ...filters }),
  LEADERBOARD: (seasonId, timeframe) => generateCacheKey('leaderboard', { seasonId, timeframe }),
  TEAM: (teamId) => generateCacheKey('team', { teamId }),
  CHAT: (groupId, before) => generateCacheKey('chat', { groupId, before }),
  SESSIONS: (userId) => generateCacheKey('sessions', { userId }),
  SEASON: (seasonId) => generateCacheKey('season', { seasonId }),
  GAME_STATS: (gameId, timeframe) => generateCacheKey('game-stats', { gameId, timeframe })
};

/**
 * @constant {Object} CACHE_CLEAR_PATTERNS
 * @description Functions to generate patterns for clearing related cache entries
 * 
 * @property {Function} PROFILE_UPDATE - Clears profile and session cache for a user
 * @property {Function} FRIEND_UPDATE - Clears friends cache for both users
 * @property {Function} BALANCE_UPDATE - Clears balance cache for a user
 * @property {Function} SHOP_UPDATE - Clears all shop-related cache entries
 * @property {Function} TEAM_UPDATE - Clears team cache
 * @property {Function} SEASON_UPDATE - Clears season and related leaderboard cache
 * @property {Function} GAME_UPDATE - Clears all game-related cache entries
 * 
 * @example
 * // Clear cache after profile update
 * const keysToDelete = CACHE_CLEAR_PATTERNS.PROFILE_UPDATE('user123');
 * 
 * // Clear cache after season update
 * const seasonKeys = CACHE_CLEAR_PATTERNS.SEASON_UPDATE('season456');
 */
const CACHE_CLEAR_PATTERNS = {
  PROFILE_UPDATE: (userId) => [
    CACHE_PATTERNS.PROFILE(userId),
    CACHE_PATTERNS.SESSIONS(userId)
  ],
  FRIEND_UPDATE: (userId, friendId) => [
    CACHE_PATTERNS.FRIENDS(userId),
    CACHE_PATTERNS.FRIENDS(friendId)
  ],
  BALANCE_UPDATE: (userId) => [
    CACHE_PATTERNS.BALANCE(userId)
  ],
  SHOP_UPDATE: (shopId) => [
    `shop-${shopId}*`  // Clear all shop-related cache entries
  ],
  TEAM_UPDATE: (teamId) => [
    CACHE_PATTERNS.TEAM(teamId)
  ],
  SEASON_UPDATE: (seasonId) => [
    CACHE_PATTERNS.SEASON(seasonId),
    `leaderboard-${seasonId}*` // Clear all leaderboard entries for this season
  ],
  GAME_UPDATE: (gameId) => [
    CACHE_PATTERNS.GAME_STATS(gameId, '*'),
    `game-${gameId}*` // Clear all game-related cache entries
  ]
};

module.exports = {
  CACHE_DURATIONS,
  CACHE_PATTERNS,
  CACHE_CLEAR_PATTERNS,
  generateCacheKey
}; 