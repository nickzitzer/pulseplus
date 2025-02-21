/**
 * @module SocialRoutes
 * @description Social interaction and management routes
 * @requires express
 * @requires multer
 * @requires ../utils/validation
 * @requires ../services/SocialService
 * @requires ../utils/routeHelpers
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { withTransaction, auditLog, handleImageUpload } = require('../utils/routeHelpers');
const { socialValidationSchemas, schemas: { commonSchemas } } = require('../utils/schemas');
const AppError = require('../utils/appError');
const SocialService = require('../services/SocialService');
const { verifyToken } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const crudFactory = require('../utils/crudFactory');
const { checkPermission, PERMISSIONS } = require('../utils/permissionService');
const { responseHandler } = require('../utils/responseHandler');
const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');
const { rateLimitPresets } = require('../utils/rateLimits');
const { uploadService } = require('../utils/fileUpload');
const { createCacheMiddleware } = require('../middleware/cacheMiddleware');
const { CACHE_PATTERNS, CACHE_CLEAR_PATTERNS } = require('../utils/cacheConfig');

// Constants
const FRIEND_LIST_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const TEAM_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * @constant {Object} ERROR_TYPES
 * @description Enumeration of social interaction error types
 * @readonly
 */
const ERROR_TYPES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  FRIEND_REQUEST_NOT_FOUND: 'FRIEND_REQUEST_NOT_FOUND',
  FRIEND_REQUEST_EXISTS: 'FRIEND_REQUEST_EXISTS',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
  TEAM_NOT_FOUND: 'TEAM_NOT_FOUND',
  TEAM_FULL: 'TEAM_FULL',
  NOT_TEAM_MEMBER: 'NOT_TEAM_MEMBER',
  INVALID_REQUEST: 'INVALID_REQUEST'
};

/**
 * @constant {Object} socialRateLimiters
 * @description Rate limiters for social interactions
 * @property {Object} friendRequests - Limiter for friend request operations
 * @property {Object} chatMessages - Limiter for chat message operations
 * @property {Object} feedPosts - Limiter for social feed posts
 */
const socialRateLimiters = {
  friendRequests: rateLimitPresets.SOCIAL.FRIEND_REQUESTS,
  chatMessages: rateLimitPresets.SOCIAL.CHAT_MESSAGES,
  feedPosts: rateLimitPresets.SOCIAL.FEED_POSTS
};

// Cache clearing function
const clearSocialCache = (userId, teamId) => {
  if (userId) {
    cacheManager.clear(CACHE_NAMES.SOCIAL, `friends-${userId}`);
  }
  if (teamId) {
    cacheManager.clear(CACHE_NAMES.SOCIAL, `team-${teamId}`);
  }
};

/**
 * @route POST /feeds
 * @description Create a new social feed post
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates feed post parameters
 * @param {Object} req.body - Feed post content and metadata
 * @param {string} req.body.content - Post content
 * @param {string[]} [req.body.tags] - Associated tags
 * @param {Object[]} [req.body.attachments] - Media attachments
 * @returns {Object} Created feed post details
 * @throws {AppError} 400 - Invalid post parameters
 * @audit CREATE_FEED - Logs feed creation in audit trail
 */
router.post('/feeds',
  verifyToken,
  validateRequest({
    body: socialValidationSchemas.feed
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const feed = await SocialService.createSocialFeed(client, {
          ...req.body,
          creator_id: req.user.sys_id
        });

        await auditLog(client, req.user, 'CREATE_FEED', {
          table: 'social_feed',
          id: feed.sys_id,
          new: feed
        });

        return feed;
      });

      responseHandler.sendCreated(res, result, 'Social feed created successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /feeds/:feedId/items
 * @description Retrieve feed items with pagination
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates feed parameters
 * @middleware createCacheMiddleware - Handles response caching
 * @param {string} req.params.feedId - Feed's unique identifier
 * @param {number} req.query.limit - Number of items to return
 * @param {number} req.query.offset - Number of items to skip
 * @returns {Object} Paginated feed items
 * @throws {AppError} 404 - Feed not found
 * @cache Uses SOCIAL cache pattern with feed ID and pagination
 */
router.get('/feeds/:feedId/items',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    query: commonSchemas.pagination
  }),
  createCacheMiddleware(
    'SOCIAL',
    (req) => CACHE_PATTERNS.FRIENDS(req.params.feedId, `feed-${req.query.offset}`)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await SocialService.getFeedItems(client, req.params.feedId, {
          limit: parseInt(req.query.limit) || 50,
          offset: parseInt(req.query.offset) || 0
        });
      });
      responseHandler.sendSuccess(res, result, 'Feed items retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /feeds/items/:itemId/interact
 * @description Create an interaction with a feed item
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates interaction parameters
 * @param {string} req.params.itemId - Feed item's unique identifier
 * @param {string} req.body.type - Type of interaction
 * @param {string} [req.body.content] - Optional interaction content
 * @returns {Object} Created interaction details
 * @throws {AppError} 404 - Feed item not found
 * @audit FEED_ITEM_INTERACTION - Logs feed interaction in audit trail
 */
router.post('/feeds/items/:itemId/interact',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: socialValidationSchemas.feedInteraction
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const interaction = await SocialService.interactWithFeedItem(
          client,
          req.params.itemId,
          req.user.sys_id,
          req.body.type,
          req.body.content
        );

        await auditLog(client, req.user, `FEED_ITEM_${req.body.type}`, {
          table: 'feed_interaction',
          id: interaction.sys_id,
          new: interaction
        });

        return interaction;
      });

      responseHandler.sendSuccess(res, result, 'Interaction added successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /chat/groups
 * @description Create a new chat group
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates chat group parameters
 * @param {Object} req.body - Chat group details
 * @param {string} req.body.name - Group name
 * @param {string[]} req.body.members - Initial group members
 * @returns {Object} Created chat group details
 * @throws {AppError} 400 - Invalid group parameters
 * @audit CREATE_CHAT_GROUP - Logs group creation in audit trail
 */
router.post('/chat/groups',
  verifyToken,
  validateRequest({
    body: socialValidationSchemas.chatGroup
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const group = await SocialService.createChatGroup(client, {
          ...req.body,
          creator_id: req.user.sys_id
        });

        await auditLog(client, req.user, 'CREATE_CHAT_GROUP', {
          table: 'chat_group',
          id: group.sys_id,
          new: group
        });

        return group;
      });

      responseHandler.sendCreated(res, result, 'Chat group created successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route GET /chat/:groupId/messages
 * @description Retrieve chat messages with pagination
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates chat parameters
 * @middleware createCacheMiddleware - Handles response caching
 * @param {string} req.params.groupId - Chat group's unique identifier
 * @param {number} req.query.limit - Number of messages to return
 * @param {string} [req.query.before] - Timestamp for pagination
 * @returns {Object} Paginated chat messages
 * @throws {AppError} 404 - Chat group not found
 * @cache Uses CHAT cache pattern with group ID and timestamp
 */
router.get('/chat/:groupId/messages',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    query: socialValidationSchemas.chatQuery
  }),
  createCacheMiddleware(
    'CHAT',
    (req) => CACHE_PATTERNS.CHAT(req.params.groupId, req.query.before)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await SocialService.getChatMessages(client, req.params.groupId, {
          limit: parseInt(req.query.limit) || 50,
          before: req.query.before
        });
      });
      
      responseHandler.sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /chat/:groupId/messages
 * @description Send a new message to a chat group
 * @middleware socialRateLimiters.chatMessages - Rate limiting for chat messages
 * @middleware verifyToken - Validates user authentication
 * @middleware uploadService.handle - Handles file attachments
 * @middleware validateRequest - Validates message parameters
 * @param {string} req.params.groupId - Chat group's unique identifier
 * @param {string} req.body.content - Message content
 * @param {File[]} [req.files] - Message attachments
 * @returns {Object} Created message details
 * @throws {AppError} 404 - Chat group not found
 * @audit SEND_MESSAGE - Logs message creation in audit trail
 * @cache Clears chat history cache
 */
router.post('/chat/:groupId/messages',
  socialRateLimiters.chatMessages,
  verifyToken,
  uploadService.handle('attachments'),
  validateRequest({
    params: commonSchemas.uuid,
    body: socialValidationSchemas.message
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        let attachmentUrls = [];
        if (req.files) {
          attachmentUrls = await Promise.all(
            req.files.map(file => 
              uploadService.processAndSave(file, 'attachments', 'chat-attachments')
            )
          );
        }

        const message = await SocialService.sendMessage(
          client,
          req.params.groupId,
          req.user.sys_id,
          req.body.content,
          attachmentUrls
        );

        await auditLog(client, req.user, 'SEND_MESSAGE', {
          table: 'chat_message',
          id: message.sys_id,
          new: message
        });

        // Clear chat history cache
        cacheManager.clear(CACHE_NAMES.SOCIAL, `chat-${req.params.groupId}`);

        return message;
      });

      responseHandler.sendCreated(res, result, 'Message sent successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /chat/messages/:messageId/reactions
 * @description Add a reaction to a chat message
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates reaction parameters
 * @param {string} req.params.messageId - Message's unique identifier
 * @param {string} req.body.emoji - Reaction emoji
 * @returns {Object} Created reaction details
 * @throws {AppError} 404 - Message not found
 * @audit ADD_REACTION - Logs reaction in audit trail
 */
router.post('/chat/messages/:messageId/reactions',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: socialValidationSchemas.messageReaction
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const reaction = await SocialService.reactToMessage(
          client,
          req.params.messageId,
          req.user.sys_id,
          req.body.emoji
        );

        await auditLog(client, req.user, 'ADD_REACTION', {
          table: 'message_reaction',
          id: reaction.sys_id,
          new: reaction
        });

        return reaction;
      });

      responseHandler.sendSuccess(res, result, 'Reaction added successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /chat/messages/:messageId/pin
 * @description Pin a message in a chat group
 * @middleware verifyToken - Validates user authentication
 * @param {string} req.params.messageId - Message's unique identifier
 * @returns {Object} Pinned message details
 * @throws {AppError} 404 - Message not found
 * @throws {AppError} 400 - Invalid message ID
 * @audit PIN_MESSAGE - Logs message pin in audit trail
 */
router.post('/chat/messages/:messageId/pin', verifyToken, async (req, res, next) => {
  try {
    const { error } = commonSchemas.uuid.validate(req.params.messageId);
    if (error) throw new AppError(error.details[0].message, 400);

    await withTransaction(async (client) => {
      const result = await SocialService.pinMessage(
        client,
        req.params.messageId,
        req.user.sys_id
      );

      await auditLog(client, req.user, 'PIN_MESSAGE', {
        table: 'pinned_message',
        id: result.sys_id,
        new: result
      });

      responseHandler.sendCreated(res, result);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /teams/:teamId/activity
 * @description Retrieve team activity feed with pagination
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates team parameters
 * @middleware createCacheMiddleware - Handles response caching
 * @param {string} req.params.teamId - Team's unique identifier
 * @param {number} req.query.limit - Number of activities to return
 * @param {number} req.query.offset - Number of activities to skip
 * @returns {Object} Paginated team activities
 * @throws {AppError} 404 - Team not found
 * @cache Uses TEAMS cache pattern with team ID and pagination
 */
router.get('/teams/:teamId/activity',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    query: commonSchemas.pagination
  }),
  createCacheMiddleware(
    'TEAMS',
    (req) => CACHE_PATTERNS.TEAM(req.params.teamId, `activity-${req.query.offset}`)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await SocialService.getTeamActivityFeed(
          client,
          req.params.teamId,
          {
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
          }
        );
      });
      responseHandler.sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /teams/:teamId/activity
 * @description Log a new team activity
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates activity parameters
 * @param {string} req.params.teamId - Team's unique identifier
 * @param {Object} req.body - Activity details
 * @returns {Object} Created activity details
 * @throws {AppError} 404 - Team not found
 * @audit LOG_TEAM_ACTIVITY - Logs team activity in audit trail
 */
router.post('/teams/:teamId/activity',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: socialValidationSchemas.teamActivity
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const activity = await SocialService.logTeamActivity(
          client,
          req.params.teamId,
          req.body
        );

        await auditLog(client, req.user, 'LOG_TEAM_ACTIVITY', {
          table: 'team_activity',
          id: activity.sys_id,
          new: activity
        });

        return activity;
      });

      responseHandler.sendCreated(res, result, 'Team activity logged successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /maintenance/logs
 * @description Create a maintenance log entry
 * @middleware verifyToken - Validates user authentication
 * @middleware checkPermission - Ensures user has ADMIN permission
 * @middleware validateRequest - Validates maintenance log parameters
 * @param {Object} req.body - Maintenance log details
 * @returns {Object} Created maintenance log entry
 * @throws {AppError} 403 - Insufficient permissions
 * @audit LOG_MAINTENANCE - Logs maintenance entry creation in audit trail
 */
router.post('/maintenance/logs',
  verifyToken,
  checkPermission(PERMISSIONS.ADMIN),
  validateRequest({
    body: socialValidationSchemas.maintenanceLog
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const log = await SocialService.logMaintenance(client, {
          ...req.body,
          logged_by: req.user.sys_id
        });

        await auditLog(client, req.user, 'LOG_MAINTENANCE', {
          table: 'maintenance_log',
          id: log.sys_id,
          new: log
        });

        return log;
      });

      responseHandler.sendCreated(res, result, 'Maintenance log created successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route GET /maintenance/history
 * @description Retrieve maintenance history with filtering
 * @middleware verifyToken - Validates user authentication
 * @middleware checkPermission - Ensures user has ADMIN permission
 * @middleware validateRequest - Validates query parameters
 * @middleware createCacheMiddleware - Handles response caching
 * @param {string} req.query.start_date - Start date for filtering
 * @param {string} req.query.end_date - End date for filtering
 * @param {string} req.query.type - Type of maintenance logs to retrieve
 * @returns {Object} Filtered maintenance history
 * @throws {AppError} 403 - Insufficient permissions
 * @cache Uses SOCIAL cache pattern with maintenance parameters
 */
router.get('/maintenance/history',
  verifyToken,
  checkPermission(PERMISSIONS.ADMIN),
  validateRequest({
    query: socialValidationSchemas.maintenanceQuery
  }),
  createCacheMiddleware(
    'SOCIAL',
    (req) => CACHE_PATTERNS.FRIENDS('maintenance', `${req.query.start_date}-${req.query.end_date}-${req.query.type}`)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await SocialService.getMaintenanceHistory(client, {
          startDate: req.query.start_date,
          endDate: req.query.end_date,
          type: req.query.type
        });
      });
      responseHandler.sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route DELETE /messages/:messageId
 * @description Delete a message
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates message ID parameter
 * @param {string} req.params.messageId - Message's unique identifier
 * @returns {Object} Success message
 * @throws {AppError} 404 - Message not found
 * @throws {AppError} 403 - Unauthorized to delete message
 * @audit DELETE_MESSAGE - Logs message deletion in audit trail
 */
router.delete('/messages/:messageId',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await SocialService.deleteMessage(client, req.params.messageId, req.user.sys_id);
        
        await auditLog(client, req.user, 'DELETE_MESSAGE', {
          table: 'message',
          id: req.params.messageId
        });
      });

      responseHandler.sendDeleted(res, { message: 'Message deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /friends/requests
 * @description Send a friend request to another user
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates friend request parameters
 * @param {Object} req.body - Friend request details
 * @param {string} req.body.friend_id - Target user ID
 * @returns {Object} Created friend request details
 * @throws {AppError} 400 - Invalid request parameters
 * @throws {AppError} 409 - Request already exists or users already friends
 * @audit SEND_FRIEND_REQUEST - Logs friend request in audit trail
 */
router.post('/friends/requests',
  verifyToken,
  validateRequest(socialValidationSchemas.friendRequest),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if users exist
        const [sender, receiver] = await Promise.all([
          SocialService.getUser(client, req.user.sys_id),
          SocialService.getUser(client, req.body.friend_id)
        ]);

        if (!sender || !receiver) {
          throw new AppError('User not found', 404, ERROR_TYPES.USER_NOT_FOUND);
        }

        // Check if already friends
        const areFriends = await SocialService.checkFriendship(client, req.user.sys_id, req.body.friend_id);
        if (areFriends) {
          throw new AppError('Users are already friends', 409, ERROR_TYPES.ALREADY_FRIENDS);
        }

        // Check for existing request
        const existingRequest = await SocialService.checkFriendRequest(client, req.user.sys_id, req.body.friend_id);
        if (existingRequest) {
          throw new AppError('Friend request already exists', 409, ERROR_TYPES.FRIEND_REQUEST_EXISTS);
        }

        const request = await SocialService.sendFriendRequest(client, {
          sender_id: req.user.sys_id,
          receiver_id: req.body.friend_id
        });

        // Clear friend list cache for both users using standardized patterns
        CACHE_CLEAR_PATTERNS.FRIEND_UPDATE(req.user.sys_id, req.body.friend_id).forEach(key => 
          cacheManager.clear(CACHE_NAMES.SOCIAL, key)
        );

        await auditLog(client, req.user, 'SEND_FRIEND_REQUEST', {
          table: 'friend_request',
          id: request.sys_id,
          new: request
        });

        return request;
      });

      responseHandler.sendCreated(res, result, 'Friend request sent successfully');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to send friend request', 500));
      }
    }
  }
);

router.get('/friends/requests',
  verifyToken,
  createCacheMiddleware(
    'FRIENDS',
    (req) => CACHE_PATTERNS.FRIENDS(req.user.sys_id, 'requests')
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const user = await SocialService.getUser(client, req.user.sys_id);
        if (!user) {
          throw new AppError('User not found', 404, ERROR_TYPES.USER_NOT_FOUND);
        }
        return await SocialService.getPendingFriendRequests(client, req.user.sys_id);
      });
      responseHandler.sendSuccess(res, result, 'Friend requests retrieved successfully');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch friend requests', 500));
      }
    }
  }
);

router.post('/friends/requests/:id/respond',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: socialValidationSchemas.friendRequestResponse
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if request exists
        const request = await SocialService.getFriendRequest(client, req.params.id);
        if (!request) {
          throw new AppError('Friend request not found', 404, ERROR_TYPES.FRIEND_REQUEST_NOT_FOUND);
        }

        // Verify request belongs to user
        if (request.receiver_id !== req.user.sys_id) {
          throw new AppError('Not authorized to respond to this request', 403);
        }

        const response = await SocialService.respondToFriendRequest(
          client,
          req.params.id,
          req.user.sys_id,
          req.body.accept
        );

        // Clear friend list cache for both users using standardized patterns
        CACHE_CLEAR_PATTERNS.FRIEND_UPDATE(response.sender_id, response.receiver_id).forEach(key => 
          cacheManager.clear(CACHE_NAMES.SOCIAL, key)
        );

        await auditLog(client, req.user, req.body.accept ? 'ACCEPT_FRIEND_REQUEST' : 'REJECT_FRIEND_REQUEST', {
          table: 'friend_request',
          id: req.params.id,
          new: response
        });

        return response;
      });

      responseHandler.sendSuccess(res, result, req.body.accept ? 'Friend request accepted' : 'Friend request rejected');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to respond to friend request', 500));
      }
    }
  }
);

router.get('/friends',
  verifyToken,
  createCacheMiddleware(
    'FRIENDS',
    (req) => CACHE_PATTERNS.FRIENDS(req.user.sys_id)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const user = await SocialService.getUser(client, req.user.sys_id);
        if (!user) {
          throw new AppError('User not found', 404, ERROR_TYPES.USER_NOT_FOUND);
        }

        return await SocialService.getFriendList(client, req.user.sys_id);
      });
      
      responseHandler.sendSuccess(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch friend list', 500));
      }
    }
  }
);

router.delete('/friends/:id',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        // Check if friendship exists
        const areFriends = await SocialService.checkFriendship(client, req.user.sys_id, req.params.id);
        if (!areFriends) {
          throw new AppError('Friendship not found', 404, ERROR_TYPES.FRIEND_REQUEST_NOT_FOUND);
        }

        await SocialService.removeFriend(client, req.user.sys_id, req.params.id);

        await auditLog(client, req.user, 'REMOVE_FRIEND', {
          table: 'friend_list',
          id: `${req.user.sys_id}:${req.params.id}`
        });

        // Clear cache for both users using standardized patterns
        CACHE_CLEAR_PATTERNS.FRIEND_UPDATE(req.user.sys_id, req.params.id).forEach(key => 
          cacheManager.clear(CACHE_NAMES.SOCIAL, key)
        );
      });

      responseHandler.sendDeleted(res, 'Friend removed successfully');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to remove friend', 500));
      }
    }
  }
);

// Team Routes
router.post('/teams',
  verifyToken,
  validateRequest({
    body: socialValidationSchemas.team
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if user exists
        const user = await SocialService.getUser(client, req.user.sys_id);
        if (!user) {
          throw new AppError('User not found', 404, ERROR_TYPES.USER_NOT_FOUND);
        }

        const team = await SocialService.createTeam(client, {
          ...req.body,
          creator_id: req.user.sys_id
        });

        await auditLog(client, req.user, 'CREATE_TEAM', {
          table: 'team',
          id: team.sys_id,
          new: team
        });

        return team;
      });

      responseHandler.sendCreated(res, result, 'Team created successfully');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to create team', 500));
      }
    }
  }
);

router.get('/teams',
  verifyToken,
  validateRequest({
    query: socialValidationSchemas.teamQuery
  }),
  createCacheMiddleware(
    'TEAMS',
    (req) => CACHE_PATTERNS.TEAM('list', req.query.game_id)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await SocialService.getUserTeams(client, req.user.sys_id, req.query.game_id);
      });
      responseHandler.sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/teams/:id',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  createCacheMiddleware(
    'TEAMS',
    (req) => CACHE_PATTERNS.TEAM(req.params.id)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const team = await SocialService.getTeamDetails(client, req.params.id);
        
        if (!team.members.some(m => m.user_id === req.user.sys_id)) {
          throw new AppError('Not authorized to view this team', 403);
        }

        return team;
      });
      
      responseHandler.sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/teams/:id/members',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_TEAM),
  validateRequest({
    params: commonSchemas.uuid,
    body: socialValidationSchemas.teamMember
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const member = await SocialService.addTeamMember(
          client,
          req.params.id,
          req.body.user_id,
          req.body.role
        );

        // Clear team cache using standardized patterns
        CACHE_CLEAR_PATTERNS.TEAM_UPDATE(req.params.id).forEach(key => 
          cacheManager.clear(CACHE_NAMES.SOCIAL, key)
        );

        await auditLog(client, req.user, 'ADD_TEAM_MEMBER', {
          table: 'team_member',
          id: member.sys_id,
          new: member
        });

        return member;
      });

      responseHandler.sendCreated(res, result, 'Team member added successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/teams/:id/members/:userId',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_TEAM),
  validateRequest({
    params: {
      id: commonSchemas.uuid,
      userId: commonSchemas.uuid
    }
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await SocialService.removeTeamMember(
          client,
          req.params.id,
          req.params.userId
        );

        await auditLog(client, req.user, 'REMOVE_TEAM_MEMBER', {
          table: 'team_member',
          id: `${req.params.id}:${req.params.userId}`
        });
      });

      responseHandler.sendDeleted(res, { message: 'Team member removed successfully' });
    } catch (err) {
      next(err);
    }
  }
);

router.put('/teams/:id/members/:userId', 
  verifyToken,
  validateRequest({
    params: {
      id: commonSchemas.uuid,
      userId: commonSchemas.uuid
    },
    body: socialValidationSchemas.teamMember
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const member = await SocialService.updateTeamMemberRole(
          client,
          req.params.id,
          req.params.userId,
          req.body.role
        );

        await auditLog(client, req.user, 'UPDATE_TEAM_MEMBER_ROLE', {
          table: 'team_member',
          id: member.sys_id,
          old: { role: member.old_role },
          new: { role: member.role }
        });

        responseHandler.sendUpdated(res, member);
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = crudFactory({
  resourceName: 'social',
  schema: socialValidationSchemas.team,
  middleware: [verifyToken],
  validations: {
    create: {
      body: socialValidationSchemas.team
    },
    update: {
      body: socialValidationSchemas.teamUpdate,
      permissions: [PERMISSIONS.MANAGE_TEAM]
    },
    delete: {
      permissions: [PERMISSIONS.MANAGE_TEAM]
    }
  },
  customEndpoints: (router) => {
    // Friend Management
    router.post('/friends/requests',
      verifyToken,
      validateRequest(socialValidationSchemas.friendRequest),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const request = await SocialService.sendFriendRequest(client, {
              sender_id: req.user.sys_id,
              receiver_id: req.body.friend_id
            });

            await auditLog(client, req.user, 'SEND_FRIEND_REQUEST', {
              table: 'friend_request',
              id: request.sys_id,
              new: request
            });

            return request;
          });

          responseHandler.sendCreated(res, result, 'Friend request sent successfully');
        } catch (error) {
          next(error);
        }
      }
    );

    router.post('/friends/requests/:id/respond',
      verifyToken,
      validateRequest({
        params: commonSchemas.uuid,
        body: socialValidationSchemas.friendRequestResponse
      }),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const response = await SocialService.respondToFriendRequest(
              client,
              req.params.id,
              req.user.sys_id,
              req.body.accept
            );

            await auditLog(client, req.user, req.body.accept ? 'ACCEPT_FRIEND_REQUEST' : 'REJECT_FRIEND_REQUEST', {
              table: 'friend_request',
              id: req.params.id,
              new: response
            });

            return response;
          });

          responseHandler.sendUpdated(res, result, req.body.accept ? 'Friend request accepted' : 'Friend request rejected');
        } catch (error) {
          next(error);
        }
      }
    );

    // Team Management
    router.post('/teams/:id/members',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_TEAM),
      validateRequest({
        params: commonSchemas.uuid,
        body: socialValidationSchemas.teamMember
      }),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const member = await SocialService.addTeamMember(
              client,
              req.params.id,
              req.body.user_id,
              req.body.role
            );

            await auditLog(client, req.user, 'ADD_TEAM_MEMBER', {
              table: 'team_member',
              id: member.sys_id,
              new: member
            });

            return member;
          });

          responseHandler.sendCreated(res, result, 'Team member added successfully');
        } catch (error) {
          next(error);
        }
      }
    );

    router.delete('/teams/:id/members/:userId',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_TEAM),
      validateRequest({
        params: {
          id: commonSchemas.uuid,
          userId: commonSchemas.uuid
        }
      }),
      async (req, res, next) => {
        try {
          await withTransaction(async (client) => {
            await SocialService.removeTeamMember(
              client,
              req.params.id,
              req.params.userId
            );

            await auditLog(client, req.user, 'REMOVE_TEAM_MEMBER', {
              table: 'team_member',
              id: `${req.params.id}:${req.params.userId}`
            });
          });

          responseHandler.sendDeleted(res, { message: 'Team member removed successfully' });
        } catch (err) {
          next(err);
        }
      }
    );

    // Message Management
    router.delete('/messages/:messageId',
      verifyToken,
      validateRequest({
        params: commonSchemas.uuid
      }),
      async (req, res, next) => {
        try {
          await withTransaction(async (client) => {
            await SocialService.deleteMessage(client, req.params.messageId, req.user.sys_id);
            
            await auditLog(client, req.user, 'DELETE_MESSAGE', {
              table: 'message',
              id: req.params.messageId
            });
          });

          responseHandler.sendDeleted(res, { message: 'Message deleted successfully' });
        } catch (error) {
          next(error);
        }
      }
    );
  }
});