/**
 * @module SeasonRoutes
 * @description Season management and competition routes
 * @requires express
 * @requires ../utils/validation
 * @requires ../services/SeasonService
 * @requires ../utils/routeHelpers
 */
const express = require('express');
const { withTransaction, auditLog, validatePermissions } = require('../utils/routeHelpers');
const AppError = require('../utils/appError');
const SeasonService = require('../services/SeasonService');
const { verifyToken } = require('../middleware/auth');
const { 
  seasonSchema, 
  seasonValidationSchemas,
  schemas: { commonSchemas }
} = require('../utils/schemas');
const crudFactory = require('../utils/crudFactory');
const { checkPermission, PERMISSIONS } = require('../utils/permissionService');
const { validateRequest } = require('../utils/validation');
const rateLimit = require('express-rate-limit');
const { responseHandler } = require('../utils/responseHandler');
const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');
const { createCacheMiddleware } = require('../middleware/cacheMiddleware');
const { rateLimitPresets } = require('../utils/rateLimits');
const { uploadService } = require('../utils/fileUpload');
const { CACHE_PATTERNS, CACHE_CLEAR_PATTERNS } = require('../utils/cacheConfig');
const { asyncHandler } = require('../utils/errorHandler');

// Add at the top with other rate limiters
const seasonLeaderboardLimiter = rateLimitPresets.STANDARD;

// Add cache constants at the top of customEndpoints
const SEASON_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache clearing utility
const clearSeasonCache = (seasonId) => {
  if (seasonId) {
    cacheManager.clear(CACHE_NAMES.SEASON, `season-${seasonId}`);
    cacheManager.clear(CACHE_NAMES.SEASON, `season-${seasonId}-leaderboard`);
  } else {
    cacheManager.clearPattern(CACHE_NAMES.SEASON, 'season-*');
  }
};

// Create the router using crudFactory
const router = crudFactory({
  resourceName: 'season',
  schema: seasonValidationSchemas.season,
  middleware: [verifyToken],
  permissions: {
    create: PERMISSIONS.MANAGE_SEASON,
    read: PERMISSIONS.VIEW_SEASON,
    update: PERMISSIONS.MANAGE_SEASON,
    delete: PERMISSIONS.MANAGE_SEASON
  },
  validations: {
    create: {
      body: seasonValidationSchemas.season
    },
    update: {
      body: seasonValidationSchemas.seasonUpdate
    }
  },
  audit: true,
  customRoutes: (router) => {
    /**
     * @route POST /
     * @description Create a new season
     */
    router.post('/',
      rateLimitPresets.GAME.CREATE_SEASON,
      validateRequest({
        body: seasonValidationSchemas.season
      }),
      checkPermission(PERMISSIONS.MANAGE_SEASON),
      uploadService.handle('general'),
      asyncHandler(async (req, res) => {
        let bannerUrl = null;
        if (req.files?.length) {
          bannerUrl = await uploadService.processAndSave(
            req.files[0],
            'general',
            'season-banners'
          );
        }

        const season = await SeasonService.createSeason({
          ...req.body,
          banner_url: bannerUrl
        });

        responseHandler.sendCreated(res, season, 'Season created successfully');
      })
    );

    /**
     * @route GET /:id
     * @description Retrieve season details
     */
    router.get('/:id',
      validateRequest({
        params: seasonValidationSchemas.seasonParams
      }),
      createCacheMiddleware(
        'SEASON',
        (req) => CACHE_PATTERNS.SEASON(req.params.id)
      ),
      asyncHandler(async (req, res) => {
        const result = await SeasonService.getSeasonDetails(req.params.id);
        responseHandler.sendSuccess(res, result, 'Season details retrieved successfully');
      })
    );

    /**
     * @route PUT /:id
     * @description Update season details
     */
    router.put('/:id',
      rateLimitPresets.GAME.MANAGE_SEASON,
      checkPermission(PERMISSIONS.MANAGE_SEASON),
      validateRequest({
        params: seasonValidationSchemas.seasonParams,
        body: seasonValidationSchemas.season
      }),
      asyncHandler(async (req, res) => {
        const season = await SeasonService.updateSeason(req.params.id, req.body);
        responseHandler.sendUpdated(res, season, 'Season updated successfully');
      })
    );

    /**
     * @route POST /:id/end
     * @description End a season and process final rankings
     */
    router.post('/:id/end',
      rateLimitPresets.GAME.MANAGE_SEASON,
      validateRequest({
        params: seasonValidationSchemas.seasonParams
      }),
      checkPermission(PERMISSIONS.MANAGE_SEASON),
      asyncHandler(async (req, res) => {
        const season = await SeasonService.endSeason(req.params.id);
        responseHandler.sendUpdated(res, season);
      })
    );

    /**
     * @route POST /tiers
     * @description Create season tier
     */
    router.post('/tiers',
      rateLimitPresets.GAME.TIER_MANAGEMENT,
      checkPermission(PERMISSIONS.MANAGE_TIERS),
      uploadService.handle('icons'),
      validateRequest({
        body: seasonValidationSchemas.seasonTier
      }),
      asyncHandler(async (req, res) => {
        // Process image upload
        let rewardImage = null;
        if (req.file) {
          rewardImage = await uploadService.processAndSave(
            req.file,
            'icons',
            'tier-rewards'
          );
        }

        const tier = await SeasonService.createSeasonTier({
          ...req.body,
          reward_image: rewardImage
        });

        responseHandler.sendCreated(res, tier, 'Season tier created successfully');
      })
    );

    /**
     * @route GET /:id/progress/:competitorId
     * @description Get season progress
     */
    router.get('/:id/progress/:competitorId',
      validateRequest({
        params: seasonValidationSchemas.competitorParams
      }),
      createCacheMiddleware(
        'SEASON',
        (req) => CACHE_PATTERNS.SEASON(req.params.id, `progress-${req.params.competitorId}`)
      ),
      asyncHandler(async (req, res) => {
        const result = await SeasonService.getSeasonProgress(
          req.params.id,
          req.params.competitorId
        );
        responseHandler.sendUpdated(res, result);
      })
    );

    /**
     * @route POST /:id/battlepass/purchase
     * @description Purchase battle pass
     */
    router.post('/:id/battlepass/purchase',
      rateLimitPresets.GAME.BATTLE_PASS,
      validateRequest({ params: commonSchemas.uuid }),
      asyncHandler(async (req, res) => {
        const battlepass = await SeasonService.purchaseBattlePass(
          req.params.id,
          req.user.sys_id
        );

        responseHandler.sendCreated(res, battlepass);
      })
    );

    /**
     * @route GET /:id/battlepass
     * @description Get battle pass details
     */
    router.get('/:id/battlepass',
      validateRequest({ params: commonSchemas.uuid }),
      createCacheMiddleware(
        'SEASON',
        (req) => CACHE_PATTERNS.SEASON(req.params.id, 'battlepass')
      ),
      asyncHandler(async (req, res) => {
        const battlepass = await SeasonService.getBattlePassDetails(
          req.params.id,
          req.user?.sys_id
        );
        
        responseHandler.sendSuccess(res, battlepass);
      })
    );

    /**
     * @route GET /:id/leaderboard
     * @description Get season leaderboard
     */
    router.get('/:id/leaderboard',
      seasonLeaderboardLimiter,
      validateRequest({
        params: commonSchemas.uuid,
        query: seasonValidationSchemas.leaderboardQuery
      }),
      createCacheMiddleware(
        'SEASON',
        (req) => CACHE_PATTERNS.SEASON(req.params.id, `leaderboard-${JSON.stringify(req.query)}`)
      ),
      asyncHandler(async (req, res) => {
        const leaderboard = await SeasonService.getSeasonLeaderboard(
          req.params.id,
          {
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0,
            sort: req.query.sort || 'score',
            order: req.query.order || 'desc'
          }
        );
        
        responseHandler.sendSuccess(res, leaderboard);
      })
    );

    /**
     * @route GET /:id/rewards
     * @description Get season rewards
     */
    router.get('/:id/rewards',
      validateRequest({ params: commonSchemas.uuid }),
      createCacheMiddleware(
        'SEASON',
        (req) => CACHE_PATTERNS.SEASON(req.params.id, 'rewards')
      ),
      asyncHandler(async (req, res) => {
        const rewards = await SeasonService.getSeasonRewards(
          req.params.id,
          req.user?.sys_id
        );
        
        responseHandler.sendSuccess(res, rewards);
      })
    );

    /**
     * @route POST /:id/rewards
     * @description Add season reward
     */
    router.post('/:id/rewards',
      checkPermission(PERMISSIONS.MANAGE_SEASON),
      uploadService.handle('rewards'),
      validateRequest({
        params: commonSchemas.uuid,
        body: seasonValidationSchemas.seasonReward
      }),
      asyncHandler(async (req, res) => {
        let rewardImage = null;
        if (req.file) {
          rewardImage = await uploadService.processAndSave(
            req.file,
            'rewards',
            'season-rewards'
          );
        }

        const reward = await SeasonService.addSeasonReward({
          ...req.body,
          season_id: req.params.id,
          image_url: rewardImage
        });

        responseHandler.sendCreated(res, reward, 'Season reward added successfully');
      })
    );

    /**
     * @route POST /:id/rewards/:rewardId/claim
     * @description Claim season reward
     */
    router.post('/:id/rewards/:rewardId/claim',
      validateRequest({
        params: {
          id: commonSchemas.uuid,
          rewardId: commonSchemas.uuid
        }
      }),
      asyncHandler(async (req, res) => {
        const claim = await SeasonService.claimSeasonReward(
          req.params.id,
          req.params.rewardId,
          req.user.sys_id
        );

        responseHandler.sendCreated(res, claim);
      })
    );

    /**
     * @route GET /:id/state
     * @description Get season state
     */
    router.get('/:id/state',
      validateRequest({ params: commonSchemas.uuid }),
      asyncHandler(async (req, res) => {
        const state = await SeasonService.getSeasonState(req.params.id);
        responseHandler.sendUpdated(res, state);
      })
    );

    /**
     * @route POST /:id/leaderboard/update
     * @description Update leaderboard entry
     */
    router.post('/:id/leaderboard/update',
      rateLimitPresets.GAME.LEADERBOARD_UPDATE,
      validateRequest({
        params: commonSchemas.uuid,
        body: seasonValidationSchemas.leaderboardUpdate
      }),
      asyncHandler(async (req, res) => {
        const leaderboard = await SeasonService.updateLeaderboardEntry(
          req.params.id,
          req.user.sys_id,
          req.body
        );

        responseHandler.sendUpdated(res, leaderboard, 'Leaderboard entry updated successfully');
      })
    );

    return router;
  }
});

module.exports = router;
