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
const { asyncHandler } = require('../utils/errorHandler');

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

// Create the base router using crudFactory
const baseRouter = crudFactory({
  resourceName: 'social',
  schema: socialValidationSchemas.team,
  middleware: [verifyToken],
  permissions: {
    create: ['ADMIN', 'SOCIAL_MANAGER', 'USER'],
    read: ['ADMIN', 'SOCIAL_MANAGER', 'USER'],
    update: ['ADMIN', 'SOCIAL_MANAGER', 'TEAM_OWNER'],
    delete: ['ADMIN', 'SOCIAL_MANAGER', 'TEAM_OWNER']
  },
  auditEnabled: true,
  validations: {
    create: {
      body: socialValidationSchemas.team
    },
    update: {
      body: socialValidationSchemas.teamUpdate
    }
  },
  customRoutes: (router) => {
    // Friend Management
    router.post('/friends/requests',
      verifyToken,
      validateRequest(socialValidationSchemas.friendRequest),
      asyncHandler(async (req, res) => {
        const result = await withTransaction(async (client) => {
          const request = await SocialService.sendFriendRequest(client, {
            sender_id: req.user.sys_id,
            receiver_id: req.body.friend_id
          });

          return request;
        });

        responseHandler.sendCreated(res, result, 'Friend request sent successfully');
      })
    );

    router.post('/friends/requests/:id/respond',
      verifyToken,
      validateRequest({
        params: commonSchemas.uuid,
        body: socialValidationSchemas.friendRequestResponse
      }),
      asyncHandler(async (req, res) => {
        const result = await withTransaction(async (client) => {
          const response = await SocialService.respondToFriendRequest(
            client,
            req.params.id,
            req.user.sys_id,
            req.body.accept
          );

          return response;
        });

        responseHandler.sendUpdated(res, result, req.body.accept ? 'Friend request accepted' : 'Friend request rejected');
      })
    );

    // Team Management
    router.post('/teams/:id/members',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_TEAM),
      validateRequest({
        params: commonSchemas.uuid,
        body: socialValidationSchemas.teamMember
      }),
      asyncHandler(async (req, res) => {
        const result = await withTransaction(async (client) => {
          const member = await SocialService.addTeamMember(
            client,
            req.params.id,
            req.body.user_id,
            req.body.role
          );

          return member;
        });

        responseHandler.sendCreated(res, result, 'Team member added successfully');
      })
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
      asyncHandler(async (req, res) => {
        await withTransaction(async (client) => {
          await SocialService.removeTeamMember(
            client,
            req.params.id,
            req.params.userId
          );
        });

        responseHandler.sendDeleted(res, { message: 'Team member removed successfully' });
      })
    );

    // Message Management
    router.delete('/messages/:messageId',
      verifyToken,
      validateRequest({
        params: commonSchemas.uuid
      }),
      asyncHandler(async (req, res) => {
        await withTransaction(async (client) => {
          await SocialService.deleteMessage(client, req.params.messageId, req.user.sys_id);
        });

        responseHandler.sendDeleted(res, { message: 'Message deleted successfully' });
      })
    );
  }
});

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
  asyncHandler(async (req, res) => {
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
  })
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
  asyncHandler(async (req, res) => {
    const result = await SocialService.getFeedItems(req.params.feedId, {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    });
    responseHandler.sendSuccess(res, result, 'Feed items retrieved successfully');
  })
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
  asyncHandler(async (req, res) => {
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
  })
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
  asyncHandler(async (req, res) => {
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
  })
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
  asyncHandler(async (req, res) => {
    const result = await withTransaction(async (client) => {
      return await SocialService.getChatMessages(client, req.params.groupId, {
        limit: parseInt(req.query.limit) || 50,
        before: req.query.before
      });
    });
    
    responseHandler.sendSuccess(res, result);
  })
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
  asyncHandler(async (req, res) => {
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
  })
);

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
  asyncHandler(async (req, res) => {
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
  })
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
  asyncHandler(async (req, res) => {
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
  })
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
  asyncHandler(async (req, res) => {
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
  })
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
  asyncHandler(async (req, res) => {
    const result = await withTransaction(async (client) => {
      return await SocialService.getMaintenanceHistory(client, {
        startDate: req.query.start_date,
        endDate: req.query.end_date,
        type: req.query.type
      });
    });
    responseHandler.sendSuccess(res, result);
  })
);

module.exports = baseRouter;