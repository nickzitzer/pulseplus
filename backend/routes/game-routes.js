/**
 * @module GameRoutes
 * @description Game management and interaction routes
 * @requires express
 * @requires ../utils/validation
 * @requires ../middleware/auth
 * @requires ../services/GameService
 * @requires ../utils/routeHelpers
 */
const express = require('express');
const { responseHandler } = require('../utils/responseHandler');
const { validateRequest } = require('../utils/validation');
const { verifyToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { withTransaction, auditLog } = require('../utils/routeHelpers');
const GameService = require('../services/GameService');
const AppError = require('../utils/appError');
const gameValidationSchemas = require('../validation/gameValidationSchemas');
const commonSchemas = require('../validation/commonSchemas');
const PERMISSIONS = require('../constants/permissions');
const { createCacheMiddleware } = require('../middleware/cache');
const { CACHE_PATTERNS } = require('../constants/cachePatterns');
const crudFactory = require('../utils/crudFactory');
const { asyncHandler } = require('../utils/errorHandler');

// Initialize router
const router = express.Router();

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
      const game = await GameService.createGame({
        ...req.body,
        gamemaster: req.user.sys_id
      });

      await withTransaction(async (client) => {
        await auditLog(client, req.user, 'CREATE_GAME', {
          table: 'game',
          id: game.sys_id,
          new: game
        });
      });

      responseHandler.sendCreated(res, game, 'Game created successfully');
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
      const result = await GameService.getGameDetails(req.params.id);
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
      const game = await GameService.updateGame(req.params.id, req.body);

      await withTransaction(async (client) => {
        await auditLog(client, req.user, 'UPDATE_GAME', {
          table: 'game',
          id: game.sys_id,
          old: game,
          new: req.body
        });
      });

      responseHandler.sendUpdated(res, game, 'Game updated successfully');
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
      await GameService.deleteGame(req.params.id);
      
      await withTransaction(async (client) => {
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
      const result = await GameService.getGameStats(req.params.id, {
        timeframe: req.query.timeframe,
        type: req.query.type
      });
      responseHandler.sendSuccess(res, result, 'Game stats retrieved successfully');
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
      const result = await GameService.getGameProgress(req.params.id, req.user.sys_id);
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
      const progress = await GameService.updateGameProgress(
        req.params.id,
        req.user.sys_id,
        req.body
      );

      await withTransaction(async (client) => {
        await auditLog(client, req.user, 'UPDATE_GAME_PROGRESS', {
          table: 'game_progress',
          id: progress.sys_id,
          old: progress,
          new: req.body
        });
      });

      responseHandler.sendUpdated(res, progress, 'Game progress updated successfully');
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

// Create the base router using crudFactory
crudFactory({
  resourceName: 'game',
  middleware: [verifyToken],
  validations: {
    create: {
      body: gameValidationSchemas.createGame
    },
    update: {
      body: gameValidationSchemas.updateGame
    },
    list: {
      query: commonSchemas.pagination
    }
  },
  permissions: {
    create: PERMISSIONS.CREATE_GAME,
    read: PERMISSIONS.VIEW_GAME,
    update: PERMISSIONS.MANAGE_GAME,
    delete: PERMISSIONS.MANAGE_GAME
  },
  audit: true,
  customRoutes: (router) => {
    /**
     * @route GET /:id/state
     * @description Retrieve current game state
     */
    router.get('/:id/state',
      verifyToken,
      validateRequest({
        params: commonSchemas.uuid
      }),
      createCacheMiddleware(
        'GAME_STATE',
        (req) => CACHE_PATTERNS.GAME_STATE(req.params.id)
      ),
      asyncHandler(async (req, res) => {
        const state = await GameService.getGameState(req.params.id);
        responseHandler.sendSuccess(res, state);
      })
    );

    /**
     * @route POST /:id/start
     * @description Start a game
     */
    router.post('/:id/start',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_GAME),
      validateRequest({
        params: commonSchemas.uuid
      }),
      asyncHandler(async (req, res) => {
        const result = await GameService.startGame(req.params.id, req.user.sys_id);
        responseHandler.sendSuccess(res, result, 'Game started successfully');
      })
    );

    /**
     * @route POST /:id/end
     * @description End a game
     */
    router.post('/:id/end',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_GAME),
      validateRequest({
        params: commonSchemas.uuid
      }),
      asyncHandler(async (req, res) => {
        const result = await GameService.endGame(req.params.id, req.user.sys_id);
        responseHandler.sendSuccess(res, result, 'Game ended successfully');
      })
    );

    /**
     * @route POST /:id/pause
     * @description Pause a game
     */
    router.post('/:id/pause',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_GAME),
      validateRequest({
        params: commonSchemas.uuid
      }),
      asyncHandler(async (req, res) => {
        const result = await GameService.pauseGame(req.params.id, req.user.sys_id);
        responseHandler.sendSuccess(res, result, 'Game paused successfully');
      })
    );

    /**
     * @route POST /:id/resume
     * @description Resume a paused game
     */
    router.post('/:id/resume',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_GAME),
      validateRequest({
        params: commonSchemas.uuid
      }),
      asyncHandler(async (req, res) => {
        const result = await GameService.resumeGame(req.params.id, req.user.sys_id);
        responseHandler.sendSuccess(res, result, 'Game resumed successfully');
      })
    );

    /**
     * @route GET /:id/players
     * @description Get all players in a game
     */
    router.get('/:id/players',
      verifyToken,
      validateRequest({
        params: commonSchemas.uuid,
        query: commonSchemas.pagination
      }),
      createCacheMiddleware(
        'GAME_PLAYERS',
        (req) => CACHE_PATTERNS.GAME_PLAYERS(req.params.id)
      ),
      asyncHandler(async (req, res) => {
        const result = await GameService.getGamePlayers(
          req.params.id,
          {
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
          }
        );
        responseHandler.sendSuccess(res, result);
      })
    );

    /**
     * @route POST /:id/players
     * @description Add a player to a game
     */
    router.post('/:id/players',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_GAME),
      validateRequest({
        params: commonSchemas.uuid,
        body: gameValidationSchemas.addPlayer
      }),
      asyncHandler(async (req, res) => {
        const result = await GameService.addPlayerToGame(
          req.params.id,
          req.body.user_id,
          req.body.role
        );
        responseHandler.sendCreated(res, result, 'Player added to game successfully');
      })
    );

    /**
     * @route DELETE /:id/players/:playerId
     * @description Remove a player from a game
     */
    router.delete('/:id/players/:playerId',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_GAME),
      validateRequest({
        params: gameValidationSchemas.gamePlayerParams
      }),
      asyncHandler(async (req, res) => {
        await GameService.removePlayerFromGame(
          req.params.id,
          req.params.playerId
        );
        responseHandler.sendSuccess(res, null, 'Player removed from game successfully');
      })
    );

    /**
     * @route GET /:id/logs
     * @description Get game activity logs
     */
    router.get('/:id/logs',
      verifyToken,
      validateRequest({
        params: commonSchemas.uuid,
        query: gameValidationSchemas.logsQuery
      }),
      asyncHandler(async (req, res) => {
        const result = await GameService.getGameLogs(
          req.params.id,
          {
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0,
            type: req.query.type,
            start_date: req.query.start_date,
            end_date: req.query.end_date
          }
        );
        responseHandler.sendSuccess(res, result);
      })
    );

    /**
     * @route GET /:id/settings
     * @description Get game settings
     */
    router.get('/:id/settings',
      verifyToken,
      validateRequest({
        params: commonSchemas.uuid
      }),
      createCacheMiddleware(
        'GAME_SETTINGS',
        (req) => CACHE_PATTERNS.GAME_SETTINGS(req.params.id)
      ),
      asyncHandler(async (req, res) => {
        const settings = await GameService.getGameSettings(req.params.id);
        responseHandler.sendSuccess(res, settings);
      })
    );

    /**
     * @route PUT /:id/settings
     * @description Update game settings
     */
    router.put('/:id/settings',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_GAME),
      validateRequest({
        params: commonSchemas.uuid,
        body: gameValidationSchemas.updateSettings
      }),
      asyncHandler(async (req, res) => {
        const result = await GameService.updateGameSettings(
          req.params.id,
          req.body
        );
        responseHandler.sendUpdated(res, result, 'Game settings updated successfully');
      })
    );
  }
});

// Export the router
module.exports = router;