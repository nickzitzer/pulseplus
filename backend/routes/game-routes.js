/**
 * @module GameRoutes
 * @description Game management and interaction routes
 * @requires express
 * @requires ../utils/validation
 * @requires ../middleware/auth
 * @requires ../services/gameService
 * @requires ../utils/routeHelpers
 */
const express = require('express');
const router = express.Router();
const { responseHandler } = require('../utils/responseHandler');
const { validateRequest } = require('../utils/validation');
const { verifyToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { withTransaction, auditLog } = require('../utils/routeHelpers');
const GameService = require('../services/gameService');
const AppError = require('../utils/appError');
const gameValidationSchemas = require('../validation/gameValidationSchemas');
const commonSchemas = require('../validation/commonSchemas');
const PERMISSIONS = require('../constants/permissions');
const { createCacheMiddleware } = require('../middleware/cache');
const { CACHE_PATTERNS } = require('../constants/cachePatterns');

/**
 * @route POST /
 * @description Create a new game
 * @middleware verifyToken - Validates user authentication
 * @middleware checkPermission - Ensures user has CREATE_GAME permission
 * @middleware validateRequest - Validates game creation parameters
 * @param {Object} req.body - Game creation parameters
 * @param {string} req.body.name - Name of the game
 * @param {string} req.body.description - Game description
 * @param {Object} req.body.settings - Game configuration settings
 * @returns {Object} Created game details
 * @throws {AppError} 403 - Insufficient permissions
 * @throws {AppError} 400 - Invalid game parameters
 * @audit CREATE_GAME - Logs game creation in audit trail
 */
router.post('/',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_GAME),
  validateRequest({
    body: gameValidationSchemas.createGame
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const game = await GameService.createGame(client, {
          ...req.body,
          creator_id: req.user.sys_id
        });

        await auditLog(client, req.user, 'CREATE_GAME', {
          table: 'game',
          id: game.sys_id,
          new: game
        });

        return game;
      });

      responseHandler.sendCreated(res, result, 'Game created successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /:id
 * @description Retrieve game details
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates game ID parameter
 * @middleware createCacheMiddleware - Handles response caching
 * @param {string} req.params.id - Game's unique identifier
 * @returns {Object} Game details including current state
 * @throws {AppError} 404 - Game not found
 * @cache Uses GAME cache pattern with game ID
 */
router.get('/:id',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  createCacheMiddleware(
    'GAME',
    (req) => CACHE_PATTERNS.GAME(req.params.id)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await GameService.getGameDetails(client, req.params.id);
      });
      responseHandler.sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.put('/:id',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_GAME),
  validateRequest({
    params: commonSchemas.uuid,
    body: gameValidationSchemas.updateGame
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const game = await GameService.updateGame(client, req.params.id, req.body);

        await auditLog(client, req.user, 'UPDATE_GAME', {
          table: 'game',
          id: game.sys_id,
          old: game,
          new: req.body
        });

        return game;
      });

      responseHandler.sendUpdated(res, result, 'Game updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /:id
 * @description Delete a game and all associated data
 * @middleware verifyToken - Validates user authentication
 * @middleware checkPermission - Ensures user has MANAGE_GAME permission
 * @middleware validateRequest - Validates game ID parameter
 * @param {string} req.params.id - Game's unique identifier
 * @returns {Object} Success message
 * @throws {AppError} 403 - Insufficient permissions
 * @throws {AppError} 404 - Game not found
 * @audit DELETE_GAME - Logs game deletion in audit trail
 */
router.delete('/:id',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_GAME),
  validateRequest({
    params: commonSchemas.uuid
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await GameService.deleteGame(client, req.params.id);
        
        await auditLog(client, req.user, 'DELETE_GAME', {
          table: 'game',
          id: req.params.id
        });
      });

      responseHandler.sendDeleted(res, 'Game deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /:id/stats
 * @description Retrieve game statistics
 * @middleware validateRequest - Validates game ID and query parameters
 * @middleware createCacheMiddleware - Handles response caching
 * @param {string} req.params.id - Game's unique identifier
 * @param {string} req.query.timeframe - Time period for stats
 * @param {string} req.query.type - Type of statistics to retrieve
 * @returns {Object} Game statistics
 * @throws {AppError} 404 - Game not found
 * @cache Uses GAME_STATS cache pattern with game ID and timeframe
 */
router.get('/:id/stats',
  validateRequest({
    params: commonSchemas.uuid,
    query: gameValidationSchemas.statsQuery
  }),
  createCacheMiddleware(
    'GAME_STATS',
    (req) => CACHE_PATTERNS.GAME_STATS(req.params.id, req.query.timeframe)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await GameService.getGameStats(client, req.params.id, {
          timeframe: req.query.timeframe,
          type: req.query.type
        });
      });
      responseHandler.sendSuccess(res, result, 'Game stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /:id/settings
 * @description Update game settings
 * @middleware verifyToken - Validates user authentication
 * @middleware checkPermission - Ensures user has MANAGE_GAME permission
 * @middleware validateRequest - Validates game settings parameters
 * @param {string} req.params.id - Game's unique identifier
 * @param {Object} req.body - Updated game settings
 * @returns {Object} Updated game settings
 * @throws {AppError} 403 - Insufficient permissions
 * @throws {AppError} 404 - Game not found
 * @audit UPDATE_GAME_SETTINGS - Logs settings update in audit trail
 */
router.put('/:id/settings',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_GAME),
  validateRequest({
    params: commonSchemas.uuid,
    body: gameValidationSchemas.gameSettings
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const settings = await GameService.updateGameSettings(client, req.params.id, req.body);

        await auditLog(client, req.user, 'UPDATE_GAME_SETTINGS', {
          table: 'game_settings',
          id: req.params.id,
          old: settings,
          new: req.body
        });

        return settings;
      });

      responseHandler.sendUpdated(res, result, 'Game settings updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /:id/progress
 * @description Retrieve user's progress in the game
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates game ID parameter
 * @middleware createCacheMiddleware - Handles response caching
 * @param {string} req.params.id - Game's unique identifier
 * @returns {Object} User's game progress
 * @throws {AppError} 404 - Game not found
 * @cache Uses GAME_STATS cache pattern with game ID and progress type
 */
router.get('/:id/progress',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  createCacheMiddleware(
    'GAME_STATS',
    (req) => CACHE_PATTERNS.GAME_STATS(req.params.id, 'progress')
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await GameService.getGameProgress(client, req.params.id, req.user.sys_id);
      });
      responseHandler.sendSuccess(res, result, 'Game progress retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /:id/progress/update
 * @description Update user's game progress
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates progress update parameters
 * @param {string} req.params.id - Game's unique identifier
 * @param {Object} req.body - Progress update data
 * @returns {Object} Updated progress details
 * @throws {AppError} 404 - Game not found
 * @audit UPDATE_GAME_PROGRESS - Logs progress update in audit trail
 */
router.post('/:id/progress/update',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: gameValidationSchemas.progressUpdate
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const progress = await GameService.updateGameProgress(
          client,
          req.params.id,
          req.user.sys_id,
          req.body
        );

        await auditLog(client, req.user, 'UPDATE_GAME_PROGRESS', {
          table: 'game_progress',
          id: progress.sys_id,
          old: progress,
          new: req.body
        });

        return progress;
      });

      responseHandler.sendUpdated(res, result, 'Game progress updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /:id/achievements/:achievementId/unlock
 * @description Unlock a game achievement for the user
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates achievement parameters
 * @param {string} req.params.id - Game's unique identifier
 * @param {string} req.params.achievementId - Achievement's unique identifier
 * @returns {Object} Unlocked achievement details
 * @throws {AppError} 404 - Game or achievement not found
 * @audit UNLOCK_ACHIEVEMENT - Logs achievement unlock in audit trail
 */
router.post('/:id/achievements/:achievementId/unlock',
  verifyToken,
  validateRequest({
    params: {
      id: commonSchemas.uuid,
      achievementId: commonSchemas.uuid
    }
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const achievement = await GameService.unlockAchievement(
          client,
          req.params.id,
          req.params.achievementId,
          req.user.sys_id
        );

        await auditLog(client, req.user, 'UNLOCK_ACHIEVEMENT', {
          table: 'game_achievement_progress',
          id: achievement.sys_id,
          new: achievement
        });

        return achievement;
      });

      responseHandler.sendCreated(res, result, 'Achievement unlocked successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;