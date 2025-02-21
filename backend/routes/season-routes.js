/**
 * @module SeasonRoutes
 * @description Season management and competition routes
 * @requires express
 * @requires ../utils/validation
 * @requires ../services/SeasonService
 * @requires ../utils/routeHelpers
 */
const express = require('express');
const router = express.Router();
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

// Add at the top with other rate limiters
const seasonLeaderboardLimiter = rateLimitPresets.STANDARD;

// Add cache constants at the top of customEndpoints
const SEASON_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * @route POST /
 * @description Create a new season
 * @middleware rateLimitPresets.GAME.CREATE_SEASON - Limits the number of requests
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates season creation parameters
 * @middleware checkPermission - Ensures user has MANAGE_SEASON permission
 * @middleware uploadService.handle - Handles file uploads
 * @param {Object} req.body - Season details
 * @param {string} req.body.name - Season name
 * @param {string} req.body.game_id - Associated game ID
 * @param {string} req.body.start_date - Season start date
 * @param {string} req.body.end_date - Season end date
 * @param {string} req.body.banner_url - Season banner URL
 * @returns {Object} Created season details
 * @throws {AppError} 403 - Insufficient permissions
 * @throws {AppError} 400 - Invalid season parameters
 * @audit CREATE - Logs season creation in audit trail
 */
router.post('/',
  rateLimitPresets.GAME.CREATE_SEASON,
  verifyToken,
  validateRequest({
    body: seasonValidationSchemas.season
  }),
  checkPermission(PERMISSIONS.MANAGE_SEASON),
  uploadService.handle('general'),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        let bannerUrl = null;
        if (req.files?.length) {
          bannerUrl = await uploadService.processAndSave(
            req.files[0],
            'general',
            'season-banners'
          );
        }

        await validatePermissions(client, req.user.sys_id, req.body.game_id, ['MANAGE_GAME']);

        const season = await SeasonService.createSeason(client, {
          ...req.body,
          banner_url: bannerUrl
        });

        await auditLog(client, req.user, 'CREATE', {
          table: 'season',
          id: season.sys_id,
          new: season
        });

        return season;
      });

      responseHandler.sendCreated(res, result, 'Season created successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /:id
 * @description Retrieve season details
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates season ID parameter
 * @middleware createCacheMiddleware - Handles response caching
 * @param {string} req.params.id - Season's unique identifier
 * @returns {Object} Season details and current state
 * @throws {AppError} 404 - Season not found
 * @cache Uses SEASON cache pattern with season ID
 */
router.get('/:id',
  verifyToken,
  validateRequest({
    params: seasonValidationSchemas.seasonParams
  }),
  createCacheMiddleware(
    'SEASON',
    (req) => CACHE_PATTERNS.SEASON(req.params.id)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await SeasonService.getSeasonDetails(client, req.params.id);
      });
      responseHandler.sendSuccess(res, result, 'Season details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /:id
 * @description Update season details
 * @middleware rateLimitPresets.GAME.MANAGE_SEASON - Limits the number of requests
 * @middleware verifyToken - Validates user authentication
 * @middleware checkPermission - Ensures user has MANAGE_SEASON permission
 * @middleware validateRequest - Validates season ID and update parameters
 * @param {string} req.params.id - Season's unique identifier
 * @param {Object} req.body - Updated season details
 * @param {string} req.body.name - Updated season name
 * @param {string} req.body.game_id - Updated associated game ID
 * @param {string} req.body.start_date - Updated season start date
 * @param {string} req.body.end_date - Updated season end date
 * @param {string} req.body.banner_url - Updated season banner URL
 * @returns {Object} Updated season details
 * @throws {AppError} 403 - Insufficient permissions
 * @throws {AppError} 400 - Invalid season parameters
 * @audit UPDATE - Logs season update in audit trail
 */
router.put('/:id',
  rateLimitPresets.GAME.MANAGE_SEASON,
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_SEASON),
  validateRequest({
    params: seasonValidationSchemas.seasonParams,
    body: seasonValidationSchemas.season
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        await validatePermissions(client, req.user.sys_id, req.body.game_id, ['MANAGE_GAME']);

        const season = await SeasonService.updateSeason(client, req.params.id, req.body);

        await auditLog(client, req.user, 'UPDATE', {
          table: 'season',
          id: season.sys_id,
          old: req.body,
          new: season
        });

        return season;
      });

      responseHandler.sendUpdated(res, result, 'Season updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /:id/end
 * @description End a season and process final rankings
 * @middleware rateLimitPresets.GAME.MANAGE_SEASON - Limits the number of requests
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates season ID parameter
 * @middleware checkPermission - Ensures user has MANAGE_SEASON permission
 * @param {string} req.params.id - Season's unique identifier
 * @returns {Object} Final season state and rankings
 * @throws {AppError} 403 - Insufficient permissions
 * @throws {AppError} 404 - Season not found
 * @audit END_SEASON - Logs season end in audit trail
 */
router.post('/:id/end',
  rateLimitPresets.GAME.MANAGE_SEASON,
  verifyToken,
  validateRequest({
    params: seasonValidationSchemas.seasonParams
  }),
  checkPermission(PERMISSIONS.MANAGE_SEASON),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const season = await SeasonService.endSeason(client, req.params.id);

        await auditLog(client, req.user, 'END_SEASON', {
          table: 'season',
          id: season.sys_id,
          new: season
        });

        return season;
      });

      responseHandler.sendUpdated(res, result, 'Season ended successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Create season tier
router.post('/tiers',
  rateLimitPresets.GAME.TIER_MANAGEMENT,
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_TIERS),
  uploadService.handle('icons'),
  validateRequest({
    body: seasonValidationSchemas.seasonTier
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        let rewardImage = null;
        if (req.file) {
          rewardImage = await uploadService.processAndSave(
            req.file,
            'icons',
            'tier-rewards'
          );
        }

        await validatePermissions(client, req.user.sys_id, req.body.season_id, ['MANAGE_GAME']);

        const tier = await SeasonService.createSeasonTier(client, {
          ...req.body,
          reward_image: rewardImage
        });

        await auditLog(client, req.user, 'CREATE', {
          table: 'season_tier',
          id: tier.sys_id,
          new: tier
        });

        return tier;
      });

      responseHandler.sendCreated(res, result, 'Season tier created successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Get season progress
router.get('/:id/progress/:competitorId',
  verifyToken,
  validateRequest({
    params: seasonValidationSchemas.competitorParams
  }),
  createCacheMiddleware(
    'SEASON',
    (req) => CACHE_PATTERNS.SEASON(req.params.id, `progress-${req.params.competitorId}`)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await SeasonService.getSeasonProgress(
          client,
          req.params.id,
          req.params.competitorId
        );
      });
      responseHandler.sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

// Purchase battle pass
router.post('/:id/battlepass/purchase',
  rateLimitPresets.GAME.BATTLE_PASS,
  verifyToken,
  validateRequest({
    params: seasonValidationSchemas.seasonParams
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const progress = await SeasonService.purchaseBattlePass(
          client,
          req.params.id,
          req.user.sys_id
        );

        await auditLog(client, req.user, 'PURCHASE_BATTLEPASS', {
          table: 'season_progress',
          id: progress.sys_id,
          new: progress
        });

        return progress;
      });

      responseHandler.sendSuccess(res, result, 'Battle Pass purchased successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Add season XP
router.post('/:id/xp',
  rateLimitPresets.GAME.SEASON_XP,
  verifyToken,
  validateRequest({
    params: seasonValidationSchemas.seasonParams,
    body: seasonValidationSchemas.addXP
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const progress = await SeasonService.addSeasonXP(
          client,
          req.params.id,
          req.user.sys_id,
          req.body.xp_amount,
          req.body.source
        );

        await auditLog(client, req.user, 'ADD_SEASON_XP', {
          table: 'season_progress',
          id: progress.sys_id,
          new: progress
        });

        return progress;
      });

      responseHandler.sendSuccess(res, result, 'Season XP added successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Claim tier reward
router.post('/:id/tiers/:tierId/claim',
  verifyToken,
  validateRequest({
    params: seasonValidationSchemas.tierClaimParams,
    body: seasonValidationSchemas.claimTierReward
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const reward = await SeasonService.claimTierReward(
          client,
          req.params.id,
          req.user.sys_id,
          req.params.tierId,
          req.body.is_premium
        );

        await auditLog(client, req.user, 'CLAIM_TIER_REWARD', {
          table: 'season_reward',
          id: reward.sys_id,
          new: reward
        });

        return reward;
      });

      responseHandler.sendSuccess(res, result, 'Tier reward claimed successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Updated season leaderboard endpoint with caching
router.get('/:id/leaderboard',
  rateLimitPresets.STANDARD,
  validateRequest({
    params: seasonValidationSchemas.seasonParams,
    query: seasonValidationSchemas.leaderboardQuery
  }),
  createCacheMiddleware(
    'LEADERBOARD',
    (req) => CACHE_PATTERNS.LEADERBOARD(req.params.id, req.query.timeframe)
  ),
  async (req, res, next) => {
    try {
      const leaderboard = await withTransaction(async (client) => {
        return await SeasonService.getSeasonLeaderboard(
          client,
          req.params.id,
          { 
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0
          }
        );
      });
      
      responseHandler.sendSuccess(res, leaderboard);
    } catch (error) {
      next(error);
    }
  }
);

// Add cache clearing function
const clearSeasonCache = (seasonId) => {
  cacheManager.clear(CACHE_NAMES.SEASON, `leaderboard-${seasonId}.*`);
};

// Competition Routes
router.post('/competitions', 
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_COMPETITIONS),
  validateRequest({
    body: seasonValidationSchemas.competition
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const competition = await SeasonService.createCompetition(client, {
          ...req.body,
          created_by: req.user.sys_id
        });

        await auditLog(client, req.user, 'CREATE_COMPETITION', {
          table: 'competition',
          id: competition.sys_id,
          new: competition
        });

        responseHandler.sendCreated(res, competition);
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/competitions/:id/join', 
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const result = await SeasonService.joinCompetition(
          client,
          req.params.id,
          req.user.sys_id
        );

        await auditLog(client, req.user, 'JOIN_COMPETITION', {
          table: 'competition_participant',
          id: result.sys_id,
          new: result
        });

        responseHandler.sendCreated(res, result);
      });
    } catch (err) {
      next(err);
    }
  }
);

// Quest Chain Routes
router.post('/quest-chains/:chainId/start', 
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const result = await SeasonService.startQuestChain(
          client,
          req.user.sys_id,
          req.params.chainId
        );

        await auditLog(client, req.user, 'START_QUEST_CHAIN', {
          table: 'quest_chain_progress',
          id: result.sys_id,
          new: result
        });

        responseHandler.sendCreated(res, result);
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/quest-chains/:chainId/progress', 
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  createCacheMiddleware(
    'SEASON',
    (req) => CACHE_PATTERNS.SEASON(req.params.chainId, `quest-progress-${req.user.sys_id}`)
  ),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const progress = await SeasonService.getQuestChainProgress(
          client,
          req.user.sys_id,
          req.params.chainId
        );
        responseHandler.sendSuccess(res, progress);
      });
    } catch (err) {
      next(err);
    }
  }
);

// Objective Routes
router.post('/objectives/:objectiveId/progress',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: seasonValidationSchemas.objectiveProgress
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const progress = await SeasonService.trackObjectiveProgress(
          client,
          req.user.sys_id,
          req.params.objectiveId,
          req.body.progress
        );

        await auditLog(client, req.user, 'UPDATE_OBJECTIVE_PROGRESS', {
          table: 'objective_progress',
          id: progress.sys_id,
          new: progress
        });

        responseHandler.sendUpdated(res, progress);
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/objectives/:questId/progress', 
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  createCacheMiddleware(
    'SEASON',
    (req) => CACHE_PATTERNS.SEASON(req.params.questId, `objective-progress-${req.user.sys_id}`)
  ),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const progress = await SeasonService.getObjectiveProgress(
          client,
          req.user.sys_id,
          req.params.questId
        );
        responseHandler.sendSuccess(res, progress);
      });
    } catch (err) {
      next(err);
    }
  }
);

// Specialized Leaderboard Routes
router.get('/:id/leaderboard/:type', 
  verifyToken,
  createCacheMiddleware(
    'LEADERBOARD',
    (req) => CACHE_PATTERNS.LEADERBOARD(req.params.id, `${req.params.type}-${req.query.timeframe}`)
  ),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const leaderboard = await SeasonService.getLeaderboardByType(
          client,
          req.params.id,
          req.params.type,
          req.query.timeframe
        );
        responseHandler.sendSuccess(res, leaderboard);
      });
    } catch (err) {
      next(err);
    }
  }
);

// Season Rewards
router.post('/:id/rewards/:tierId/claim', verifyToken, async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const rewards = await SeasonService.claimSeasonRewards(
        client,
        req.params.id,
        req.user.sys_id,
        req.params.tierId
      );

      await auditLog(client, req.user, 'CLAIM_SEASON_REWARDS', {
        table: 'season_rewards',
        id: rewards.sys_id,
        new: rewards
      });

      responseHandler.sendUpdated(res, rewards);
    });
  } catch (err) {
    next(err);
  }
});

// Season Archive Routes
router.get('/:id/archive',
  verifyToken,
  checkPermission(PERMISSIONS.VIEW_ARCHIVES),
  createCacheMiddleware(
    'SEASON',
    (req) => CACHE_PATTERNS.SEASON(req.params.id, 'archive')
  ),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const archive = await SeasonService.getSeasonArchive(client, req.params.id);
        responseHandler.sendUpdated(res, archive);
      });
    } catch (err) {
      next(err);
    }
  }
);

// Season Analytics Routes
router.get('/:id/analytics',
  checkPermission(PERMISSIONS.VIEW_ANALYTICS),
  validateRequest({
    params: seasonValidationSchemas.seasonParams,
    query: seasonValidationSchemas.analyticsQuery
  }),
  createCacheMiddleware(
    'SEASON',
    (req) => CACHE_PATTERNS.SEASON(req.params.id, `analytics-${req.query.start_date}-${req.query.end_date}`)
  ),
  async (req, res, next) => {
    try {
      const analytics = await withTransaction(async (client) => {
        return await SeasonService.getSeasonAnalytics(
          client,
          req.params.id,
          {
            startDate: req.query.start_date,
            endDate: req.query.end_date,
            metrics: req.query.metrics?.split(',')
          }
        );
      });
      responseHandler.sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id/analytics/engagement',
  verifyToken,
  checkPermission(PERMISSIONS.VIEW_ANALYTICS),
  createCacheMiddleware(
    'SEASON',
    (req) => CACHE_PATTERNS.SEASON(req.params.id, `engagement-${req.query.timeframe}`)
  ),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const engagement = await SeasonService.getEngagementMetrics(
          client,
          req.params.id,
          req.query.timeframe
        );
        responseHandler.sendSuccess(res, engagement);
      });
    } catch (err) {
      next(err);
    }
  }
);

// Tier Management Routes
router.put('/tiers/:tierId',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_TIERS),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const tier = await SeasonService.updateSeasonTier(
          client,
          req.params.tierId,
          req.body
        );

        await auditLog(client, req.user, 'UPDATE_TIER', {
          table: 'season_tier',
          id: tier.sys_id,
          old: req.body,
          new: tier
        });

        responseHandler.sendUpdated(res, tier);
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/tiers/:tierId',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_TIERS),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await SeasonService.deleteSeasonTier(client, req.params.tierId);

        await auditLog(client, req.user, 'DELETE_TIER', {
          table: 'season_tier',
          id: req.params.tierId
        });

        responseHandler.sendDeleted(res);
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:id/tiers/distribution',
  verifyToken,
  checkPermission(PERMISSIONS.VIEW_ANALYTICS),
  createCacheMiddleware(
    'SEASON',
    (req) => CACHE_PATTERNS.SEASON(req.params.id, 'tier-distribution')
  ),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        const distribution = await SeasonService.getTierDistribution(
          client,
          req.params.id
        );
        responseHandler.sendUpdated(res, distribution);
      });
    } catch (err) {
      next(err);
    }
  }
);

// Season Rewards Management
router.post('/:id/rewards/bulk-claim',
  rateLimitPresets.BULK,
  validateRequest({
    params: seasonValidationSchemas.seasonParams,
    body: seasonValidationSchemas.bulkClaimRewards
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const rewards = await SeasonService.bulkClaimRewards(
          client,
          req.params.id,
          req.user.sys_id,
          req.body.tier_ids
        );
        
        await auditLog(client, req.user, 'BULK_CLAIM_REWARDS', {
          table: 'season_reward',
          ids: rewards.map(r => r.sys_id)
        });
        
        return rewards;
      });
      responseHandler.sendUpdated(res, result, 'Rewards claimed successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id/rewards/history', verifyToken, async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const history = await SeasonService.getRewardsHistory(
        client,
        req.params.id,
        req.user.sys_id
      );
      responseHandler.sendUpdated(res, history);
    });
  } catch (err) {
    next(err);
  }
});

// Season Status Management
router.patch('/:id/status',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_SEASON),
  validateRequest({
    params: commonSchemas.uuid,
    body: seasonValidationSchemas.seasonStatus
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const season = await SeasonService.updateSeasonStatus(
          client,
          req.params.id,
          req.body.status
        );

        // Clear season cache using standardized patterns
        CACHE_CLEAR_PATTERNS.SEASON_UPDATE(req.params.id).forEach(key => 
          cacheManager.clear(CACHE_NAMES.SEASON, key)
        );

        await auditLog(client, req.user, 'UPDATE_SEASON_STATUS', {
          table: 'season',
          id: season.sys_id,
          old: { status: season.old_status },
          new: { status: season.status }
        });

        return season;
      });

      responseHandler.sendUpdated(res, result, 'Season status updated');
    } catch (error) {
      next(error);
    }
  }
);

// Season Progress
router.get('/:id/progress',
  verifyToken,
  validateRequest({ params: commonSchemas.uuid }),
  async (req, res, next) => {
    try {
      const progress = await withTransaction(async (client) => {
        return await SeasonService.getSeasonProgress(client, req.params.id);
      });
      responseHandler.sendUpdated(res, progress);
    } catch (error) {
      next(error);
    }
  }
);

// Season Rewards
router.post('/:id/rewards',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_REWARDS),
  validateRequest({
    params: commonSchemas.uuid,
    body: seasonValidationSchemas.seasonReward
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const reward = await SeasonService.addSeasonReward(client, {
          season_id: req.params.id,
          ...req.body
        });

        await auditLog(client, req.user, 'ADD_SEASON_REWARD', {
          table: 'season_reward',
          id: reward.sys_id,
          new: reward
        });

        return reward;
      });

      responseHandler.sendCreated(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:id/rewards/:rewardId/claim',
  verifyToken,
  validateRequest({
    params: {
      id: commonSchemas.uuid,
      rewardId: commonSchemas.uuid
    }
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const claim = await SeasonService.claimSeasonReward(
          client,
          req.params.id,
          req.params.rewardId,
          req.user.sys_id
        );

        await auditLog(client, req.user, 'CLAIM_SEASON_REWARD', {
          table: 'season_reward_claim',
          id: claim.sys_id,
          new: claim
        });

        return claim;
      });

      responseHandler.sendCreated(res, result);
    } catch (error) {
      next(error);
    }
  }
);

// Season State Endpoint
router.get('/:id/state',
  validateRequest({ params: commonSchemas.uuid }),
  async (req, res, next) => {
    try {
      const state = await withTransaction(async (client) => {
        return await SeasonService.getSeasonState(client, req.params.id);
      });
      responseHandler.sendUpdated(res, state);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:id/leaderboard/update',
  rateLimitPresets.GAME.LEADERBOARD_UPDATE,
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: seasonValidationSchemas.leaderboardUpdate
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const leaderboard = await SeasonService.updateLeaderboardEntry(
          client,
          req.params.id,
          req.user.sys_id,
          req.body
        );

        await auditLog(client, req.user, 'UPDATE_LEADERBOARD', {
          table: 'season_leaderboard',
          id: leaderboard.sys_id,
          old: leaderboard,
          new: req.body
        });

        return leaderboard;
      });

      responseHandler.sendUpdated(res, result, 'Leaderboard entry updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = crudFactory({
  resourceName: 'season',
  schema: seasonValidationSchemas.season,
  middleware: [verifyToken],
  validations: {
    create: {
      body: seasonValidationSchemas.season,
      permissions: [PERMISSIONS.MANAGE_SEASON]
    },
    update: {
      body: seasonValidationSchemas.seasonUpdate,
      permissions: [PERMISSIONS.MANAGE_SEASON]
    },
    delete: {
      permissions: [PERMISSIONS.MANAGE_SEASON]
    }
  },
  customEndpoints: (router) => {
    // Season Management
    router.post('/:id/end',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_SEASON),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const season = await SeasonService.endSeason(client, req.params.id);
            
            await auditLog(client, req.user, 'END_SEASON', {
              table: 'season',
              id: season.sys_id,
              new: season
            });

            return season;
          });

          responseHandler.sendUpdated(res, result);
        } catch (error) {
          next(error);
        }
      }
    );

    // Battle Pass
    router.post('/:id/battlepass/purchase',
      verifyToken,
      rateLimitPresets.GAME.BATTLE_PASS,
      validateRequest({ params: commonSchemas.uuid }),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const battlepass = await SeasonService.purchaseBattlePass(
              client,
              req.params.id,
              req.user.sys_id
            );

            await auditLog(client, req.user, 'PURCHASE_BATTLEPASS', {
              table: 'battle_pass',
              id: battlepass.sys_id,
              new: battlepass
            });

            return battlepass;
          });

          responseHandler.sendCreated(res, result);
        } catch (error) {
          next(error);
        }
      }
    );

    // Season Progress
    router.get('/:id/progress/:competitorId',
      verifyToken,
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            return await SeasonService.getSeasonProgress(
              client,
              req.params.id,
              req.params.competitorId
            );
          });

          responseHandler.sendUpdated(res, result);
        } catch (error) {
          next(error);
        }
      }
    );

    return router;
  }
});
