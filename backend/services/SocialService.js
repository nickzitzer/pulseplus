const AppError = require('../utils/appError');
const redisClient = require('../config/redis');
const { createCrudService, withTransaction } = require('../utils/serviceFactory');
const { logger } = require('../utils/logger');
const { clearResourceCache } = require('../utils/cacheConfig');
const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');

/**
 * @module SocialService
 * @description Service handling all social interactions including friends, teams, chat, and feeds
 * @requires ../utils/serviceFactory
 * @requires ../utils/appError
 * @requires ../utils/logger
 * @requires ../utils/cacheConfig
 * @requires ../utils/cacheService
 * @requires ../config/redis
 */

// Create base CRUD service for friendships
const baseCrudService = createCrudService('friendship', {
  idField: 'sys_id',
  searchFields: ['user_id', 'friend_id'],
  allowedFields: ['user_id', 'friend_id', 'status', 'notes'],
  hooks: {
    afterCreate: async (friendship, currentUser, client) => {
      // Clear cache
      clearResourceCache(cacheManager, CACHE_NAMES.SOCIAL, 'FRIENDSHIP', 'CREATE');
      
      // Log creation
      logger.info(`Friendship created: ${friendship.user_id} -> ${friendship.friend_id}`, {
        userId: friendship.user_id,
        friendId: friendship.friend_id,
        createdBy: currentUser?.id
      });
    },
    afterUpdate: async (friendship, oldData, currentUser) => {
      // Clear cache
      clearResourceCache(cacheManager, CACHE_NAMES.SOCIAL, 'FRIENDSHIP', 'UPDATE', friendship.sys_id);
      
      // Log update
      logger.info(`Friendship updated: ${friendship.user_id} -> ${friendship.friend_id}`, {
        userId: friendship.user_id,
        friendId: friendship.friend_id,
        status: friendship.status,
        updatedBy: currentUser?.id
      });
    }
  }
});

/**
 * @function addFriend
 * @description Creates a new friend request between two users
 * @param {string} userId - ID of the user sending the request
 * @param {string} friendId - ID of the user receiving the request
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Created friendship record
 * @throws {AppError} If friend request already exists
 */
const addFriend = async (userId, friendId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    const { rows } = await dbClient.query(
      `INSERT INTO friendship 
      (user_id, friend_id, status)
      VALUES ($1, $2, 'PENDING')
      ON CONFLICT (user_id, friend_id) DO NOTHING
      RETURNING *`,
      [userId, friendId]
    );

    if (rows.length === 0) {
      throw new AppError('Friend request already exists', 400, 'DUPLICATE_REQUEST');
    }

    // Log friend request
    logger.info(`Friend request sent: ${userId} -> ${friendId}`);

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.SOCIAL, 'FRIENDSHIP', 'CREATE');

    return rows[0];
  }, client);
};

/**
 * @function getFriendsList
 * @description Retrieves a user's friends list with detailed statistics
 * @param {string} userId - User's ID
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Array<Object>>} List of friends with their details and shared statistics
 */
const getFriendsList = async (userId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    const { rows } = await dbClient.query(`
      WITH friend_stats AS (
        SELECT 
          f.friend_id,
          COUNT(DISTINCT g.sys_id) as shared_games,
          COUNT(DISTINCT t.sys_id) as shared_teams
        FROM friendship f
        LEFT JOIN competitor c1 ON f.user_id = c1.user_id
        LEFT JOIN competitor c2 ON f.friend_id = c2.user_id AND c1.game_id = c2.game_id
        LEFT JOIN game g ON c1.game_id = g.sys_id
        LEFT JOIN team_member tm1 ON c1.sys_id = tm1.competitor_id
        LEFT JOIN team_member tm2 ON c2.sys_id = tm2.competitor_id AND tm1.team_id = tm2.team_id
        LEFT JOIN team t ON tm1.team_id = t.sys_id
        WHERE f.user_id = $1 AND f.status = 'ACCEPTED'
        GROUP BY f.friend_id
      )
      SELECT 
        u.sys_id,
        u.user_name,
        u.avatar_url,
        u.status as user_status,
        u.last_active,
        fs.shared_games,
        fs.shared_teams,
        json_build_object(
          'level', MAX(c.level),
          'achievements', COUNT(DISTINCT ca.achievement_id),
          'badges', COUNT(DISTINCT cb.badge_id)
        ) as stats
      FROM friend_stats fs
      JOIN sys_user u ON fs.friend_id = u.sys_id
      LEFT JOIN competitor c ON u.sys_id = c.user_id
      LEFT JOIN competitor_achievement ca ON c.sys_id = ca.competitor_id
      LEFT JOIN competitor_badge cb ON c.sys_id = cb.competitor_id
      GROUP BY u.sys_id, u.user_name, u.avatar_url, u.status, u.last_active, 
               fs.shared_games, fs.shared_teams`,
      [userId]
    );

    return rows;
  }, client);
};

/**
 * @function getPendingFriendRequests
 * @description Retrieves all pending friend requests for a user
 * @param {string} userId - User's ID
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Array<Object>>} List of pending friend requests with user details
 */
const getPendingFriendRequests = async (userId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    const { rows } = await dbClient.query(`
      SELECT 
        f.*,
        u.user_name,
        u.avatar_url,
        u.status as user_status,
        json_build_object(
          'level', MAX(c.level),
          'achievements', COUNT(DISTINCT ca.achievement_id)
        ) as stats
      FROM friendship f
      JOIN sys_user u ON f.user_id = u.sys_id
      LEFT JOIN competitor c ON u.sys_id = c.user_id
      LEFT JOIN competitor_achievement ca ON c.sys_id = ca.competitor_id
      WHERE f.friend_id = $1 AND f.status = 'PENDING'
      GROUP BY f.sys_id, f.user_id, f.friend_id, f.status, f.created_at,
               u.user_name, u.avatar_url, u.status`,
      [userId]
    );

    return rows;
  }, client);
};

/**
 * @function respondToFriendRequest
 * @description Accepts or rejects a friend request
 * @param {string} requestId - Friendship request ID
 * @param {string} userId - User's ID (the one responding)
 * @param {boolean} accept - Whether to accept the request
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Updated friendship record
 * @throws {AppError} If request not found or not pending
 */
const respondToFriendRequest = async (requestId, userId, accept, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Verify request exists and belongs to user
    const { rows: requests } = await dbClient.query(
      `SELECT * FROM friendship 
      WHERE sys_id = $1 AND friend_id = $2 AND status = 'PENDING'`,
      [requestId, userId]
    );

    if (requests.length === 0) {
      throw new AppError('Friend request not found or already processed', 404, 'REQUEST_NOT_FOUND');
    }

    // Update request status
    const { rows: updated } = await dbClient.query(
      `UPDATE friendship 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE sys_id = $2
      RETURNING *`,
      [accept ? 'ACCEPTED' : 'REJECTED', requestId]
    );

    // If accepted, create reverse friendship
    if (accept) {
      await dbClient.query(
        `INSERT INTO friendship 
        (user_id, friend_id, status)
        VALUES ($1, $2, 'ACCEPTED')
        ON CONFLICT (user_id, friend_id) 
        DO UPDATE SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP`,
        [userId, requests[0].user_id]
      );
    }

    // Log response
    logger.info(`Friend request ${accept ? 'accepted' : 'rejected'}: ${requestId}`, {
      requestId,
      userId,
      action: accept ? 'ACCEPTED' : 'REJECTED'
    });

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.SOCIAL, 'FRIENDSHIP', 'UPDATE');

    return updated[0];
  }, client);
};

/**
 * @function removeFriend
 * @description Removes a friendship between two users
 * @param {string} userId - User's ID
 * @param {string} friendId - Friend's ID to remove
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<boolean>} True if friendship was removed
 */
const removeFriend = async (userId, friendId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Remove both friendship records
    await dbClient.query(
      `DELETE FROM friendship 
      WHERE (user_id = $1 AND friend_id = $2) 
      OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    // Log removal
    logger.info(`Friendship removed between ${userId} and ${friendId}`, {
      userId,
      friendId
    });

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.SOCIAL, 'FRIENDSHIP', 'DELETE');

    return true;
  }, client);
};

/**
 * @function createTeam
 * @description Creates a new team with the specified owner
 * @param {string} name - Team name
 * @param {string} gameId - Game ID
 * @param {string} ownerId - Owner's competitor ID
 * @param {Object} [teamData={}] - Additional team data
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Created team details
 */
const createTeam = async (name, gameId, ownerId, teamData = {}, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Create team
    const { rows: [team] } = await dbClient.query(
      `INSERT INTO team 
      (name, game_id, description, logo_url, banner_url, is_public, max_members)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        name,
        gameId,
        teamData.description || '',
        teamData.logo_url || null,
        teamData.banner_url || null,
        teamData.is_public !== undefined ? teamData.is_public : true,
        teamData.max_members || 10
      ]
    );

    // Add owner as member with OWNER role
    await dbClient.query(
      `INSERT INTO team_member 
      (team_id, competitor_id, role, joined_at)
      VALUES ($1, $2, 'OWNER', CURRENT_TIMESTAMP)`,
      [team.sys_id, ownerId]
    );

    // Log team creation
    logger.info(`Team created: ${name} (${team.sys_id})`, {
      teamId: team.sys_id,
      gameId,
      ownerId
    });

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.SOCIAL, 'TEAM', 'CREATE');

    return {
      ...team,
      owner_id: ownerId,
      member_count: 1
    };
  }, client);
};

// Export service with all methods
const SocialService = {
  // Base CRUD operations
  ...baseCrudService,
  
  // Custom methods
  addFriend,
  getFriendsList,
  getPendingFriendRequests,
  respondToFriendRequest,
  removeFriend,
  createTeam,
  // Add all other methods here...
};

module.exports = SocialService; 