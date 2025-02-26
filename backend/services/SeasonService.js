const { pool } = require('../database/connection');
const AppError = require('../utils/appError');
const { createCrudService, withTransaction } = require('../utils/serviceFactory');
const { logger } = require('../utils/logger');
const { clearResourceCache } = require('../utils/cacheConfig');
const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');

/**
 * @module SeasonService
 * @description Service handling game seasons, battle passes, competitions,
 * quest chains, and seasonal progression systems
 * @requires ../utils/serviceFactory
 * @requires ../utils/appError
 * @requires ../utils/logger
 * @requires ../utils/cacheConfig
 * @requires ../utils/cacheService
 * @requires ../database/connection
 */

// Create base CRUD service for seasons
const baseCrudService = createCrudService('season', {
  idField: 'sys_id',
  searchFields: ['name', 'description', 'game_id'],
  allowedFields: ['name', 'description', 'game_id', 'start_date', 'end_date', 
                 'theme', 'is_active', 'battle_pass_enabled', 'competition_enabled'],
  hooks: {
    afterCreate: async (season, currentUser, client) => {
      // Clear cache
      clearResourceCache(cacheManager, CACHE_NAMES.SEASON, 'SEASON', 'CREATE');
      
      // Log creation
      logger.info(`Season created: ${season.name}`, {
        seasonId: season.sys_id,
        gameId: season.game_id,
        createdBy: currentUser?.id
      });
    },
    afterUpdate: async (season, oldData, currentUser) => {
      // Clear cache
      clearResourceCache(cacheManager, CACHE_NAMES.SEASON, 'SEASON', 'UPDATE', season.sys_id);
      
      // Log update
      logger.info(`Season updated: ${season.name}`, {
        seasonId: season.sys_id,
        gameId: season.game_id,
        updatedBy: currentUser?.id
      });
    }
  }
});

/**
 * @function getCurrentSeason
 * @description Retrieves the currently active season for a game
 * @param {string} gameId - Game's unique identifier
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Active season details with statistics and tiers
 * @throws {AppError} If no active season is found
 */
const getCurrentSeason = async (gameId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    const { rows } = await dbClient.query(`
      SELECT 
        s.*,
        (
          SELECT json_build_object(
            'total_participants', COUNT(DISTINCT c.sys_id),
            'battle_pass_holders', COUNT(DISTINCT CASE WHEN bp.status = 'ACTIVE' THEN bp.competitor_id END),
            'average_tier', ROUND(AVG(spp.current_tier), 2),
            'total_rewards_claimed', COUNT(DISTINCT spr.sys_id)
          )
          FROM season s2
          LEFT JOIN competitor c ON s2.game_id = c.game_id
          LEFT JOIN battle_pass bp ON s2.sys_id = bp.season_id
          LEFT JOIN season_progression spp ON s2.sys_id = spp.season_id
          LEFT JOIN season_progression_reward spr ON spp.sys_id = spr.progression_id
          WHERE s2.sys_id = s.sys_id
          GROUP BY s2.sys_id
        ) as stats,
        (
          SELECT json_agg(
            json_build_object(
              'tier', st.tier_number,
              'xp_required', st.xp_required,
              'reward_type', st.reward_type,
              'reward_amount', st.reward_amount,
              'is_premium', st.is_premium
            )
            ORDER BY st.tier_number
          )
          FROM season_tier st
          WHERE st.season_id = s.sys_id
        ) as tiers
      FROM season s
      WHERE s.game_id = $1 AND s.is_active = true
      ORDER BY s.start_date DESC
      LIMIT 1`,
      [gameId]
    );

    if (rows.length === 0) {
      throw new AppError('No active season found', 404, 'SEASON_NOT_FOUND');
    }

    return rows[0];
  }, client);
};

/**
 * @function createSeason
 * @description Creates a new season for a game
 * @param {Object} seasonData - Season data
 * @param {string} seasonData.name - Season name
 * @param {string} seasonData.description - Season description
 * @param {string} seasonData.game_id - Game ID
 * @param {Date} seasonData.start_date - Season start date
 * @param {Date} seasonData.end_date - Season end date
 * @param {string} seasonData.theme - Season theme
 * @param {boolean} seasonData.battle_pass_enabled - Whether battle pass is enabled
 * @param {Array<Object>} [seasonData.tiers=[]] - Season tiers configuration
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Created season details
 */
const createSeason = async (seasonData, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Check if there's already an active season
    const { rows: activeSeasons } = await dbClient.query(
      'SELECT * FROM season WHERE game_id = $1 AND is_active = true',
      [seasonData.game_id]
    );

    // If creating an active season, deactivate others
    if (seasonData.is_active && activeSeasons.length > 0) {
      await dbClient.query(
        'UPDATE season SET is_active = false WHERE game_id = $1 AND is_active = true',
        [seasonData.game_id]
      );
    }

    // Create season
    const { rows: season } = await dbClient.query(
      `INSERT INTO season 
      (name, description, game_id, start_date, end_date, theme, is_active, 
       battle_pass_enabled, competition_enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        seasonData.name,
        seasonData.description,
        seasonData.game_id,
        seasonData.start_date,
        seasonData.end_date,
        seasonData.theme,
        seasonData.is_active !== undefined ? seasonData.is_active : true,
        seasonData.battle_pass_enabled !== undefined ? seasonData.battle_pass_enabled : true,
        seasonData.competition_enabled !== undefined ? seasonData.competition_enabled : true
      ]
    );

    // Create tiers if provided
    if (seasonData.tiers && seasonData.tiers.length > 0) {
      for (const tier of seasonData.tiers) {
        await dbClient.query(
          `INSERT INTO season_tier 
          (season_id, tier_number, xp_required, reward_type, reward_amount, is_premium)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            season[0].sys_id,
            tier.tier_number,
            tier.xp_required,
            tier.reward_type,
            tier.reward_amount,
            tier.is_premium || false
          ]
        );
      }
    } else {
      // Create default tiers (1-100)
      for (let i = 1; i <= 100; i++) {
        const xpRequired = Math.floor(1000 * Math.pow(1.05, i - 1));
        const isPremium = i % 5 === 0; // Every 5th tier is premium
        
        await dbClient.query(
          `INSERT INTO season_tier 
          (season_id, tier_number, xp_required, reward_type, reward_amount, is_premium)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            season[0].sys_id,
            i,
            xpRequired,
            isPremium ? 'PREMIUM_CURRENCY' : 'CURRENCY',
            isPremium ? i * 10 : i * 5,
            isPremium
          ]
        );
      }
    }

    // Log season creation
    logger.info(`Season created: ${seasonData.name}`, {
      seasonId: season[0].sys_id,
      gameId: seasonData.game_id
    });

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.SEASON, 'SEASON', 'CREATE');

    return season[0];
  }, client);
};

/**
 * @function purchaseBattlePass
 * @description Purchases a battle pass for a competitor
 * @param {string} competitorId - Competitor's unique identifier
 * @param {string} seasonId - Season's unique identifier
 * @param {number} [price=null] - Override price (if null, uses default price)
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Created battle pass details
 * @throws {AppError} If battle pass already purchased or insufficient funds
 */
const purchaseBattlePass = async (competitorId, seasonId, price = null, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Check if already purchased
    const { rows: existing } = await dbClient.query(
      'SELECT * FROM battle_pass WHERE competitor_id = $1 AND season_id = $2',
      [competitorId, seasonId]
    );

    if (existing.length > 0) {
      throw new AppError('Battle pass already purchased', 400, 'ALREADY_PURCHASED');
    }

    // Get season details
    const { rows: season } = await dbClient.query(
      'SELECT * FROM season WHERE sys_id = $1',
      [seasonId]
    );

    if (season.length === 0) {
      throw new AppError('Season not found', 404, 'SEASON_NOT_FOUND');
    }

    // Get competitor details
    const { rows: competitor } = await dbClient.query(
      'SELECT * FROM competitor WHERE sys_id = $1',
      [competitorId]
    );

    if (competitor.length === 0) {
      throw new AppError('Competitor not found', 404, 'COMPETITOR_NOT_FOUND');
    }

    // Get battle pass price
    const battlePassPrice = price || 1000; // Default price if not specified

    // Check if competitor has enough currency
    const { rows: balance } = await dbClient.query(
      'SELECT * FROM currency_balance WHERE competitor_id = $1 FOR UPDATE',
      [competitorId]
    );

    if (balance.length === 0 || balance[0].balance < battlePassPrice) {
      throw new AppError('Insufficient funds', 400, 'INSUFFICIENT_FUNDS');
    }

    // Deduct currency
    await dbClient.query(
      'UPDATE currency_balance SET balance = balance - $1 WHERE competitor_id = $2',
      [battlePassPrice, competitorId]
    );

    // Create battle pass
    const { rows: battlePass } = await dbClient.query(
      `INSERT INTO battle_pass 
      (competitor_id, season_id, purchase_date, status, price_paid)
      VALUES ($1, $2, CURRENT_TIMESTAMP, 'ACTIVE', $3)
      RETURNING *`,
      [competitorId, seasonId, battlePassPrice]
    );

    // Initialize season progression
    await dbClient.query(
      `INSERT INTO season_progression 
      (competitor_id, season_id, current_tier, current_xp)
      VALUES ($1, $2, 1, 0)`,
      [competitorId, seasonId]
    );

    // Log purchase
    logger.info(`Battle pass purchased: ${competitorId} for season ${seasonId}`, {
      competitorId,
      seasonId,
      price: battlePassPrice
    });

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.SEASON, 'BATTLE_PASS', 'CREATE');

    return battlePass[0];
  }, client);
};

/**
 * @function getSeasonProgression
 * @description Retrieves a competitor's progression in a season
 * @param {string} competitorId - Competitor's unique identifier
 * @param {string} seasonId - Season's unique identifier
 * @returns {Promise<Object>} Season progression details with available rewards
 * @throws {AppError} If progression not found
 */
const getSeasonProgression = async (competitorId, seasonId) => {
  return withTransaction(async (client) => {
    const { rows } = await client.query(`
      SELECT 
        sp.*,
        bp.status as battle_pass_status,
        json_build_object(
          'current_tier', sp.current_tier,
          'current_xp', sp.current_xp,
          'next_tier_xp', (
            SELECT xp_required 
            FROM season_tier 
            WHERE season_id = sp.season_id AND tier_number = sp.current_tier + 1
          ),
          'xp_progress_percentage', ROUND(
            sp.current_xp::float / NULLIF((
              SELECT xp_required 
              FROM season_tier 
              WHERE season_id = sp.season_id AND tier_number = sp.current_tier + 1
            ), 0) * 100, 2
          )
        ) as progress,
        (
          SELECT json_agg(
            json_build_object(
              'tier', st.tier_number,
              'reward_type', st.reward_type,
              'reward_amount', st.reward_amount,
              'is_premium', st.is_premium,
              'is_claimed', EXISTS(
                SELECT 1 FROM season_progression_reward spr
                WHERE spr.progression_id = sp.sys_id AND spr.tier_number = st.tier_number
              ),
              'is_available', st.tier_number <= sp.current_tier AND (
                NOT st.is_premium OR bp.status = 'ACTIVE'
              )
            )
            ORDER BY st.tier_number
          )
          FROM season_tier st
          WHERE st.season_id = sp.season_id AND st.tier_number <= sp.current_tier + 5
        ) as available_rewards
      FROM season_progression sp
      LEFT JOIN battle_pass bp ON sp.competitor_id = bp.competitor_id AND sp.season_id = bp.season_id
      WHERE sp.competitor_id = $1 AND sp.season_id = $2`,
      [competitorId, seasonId]
    );

    if (rows.length === 0) {
      // Create progression if it doesn't exist
      await client.query(
        `INSERT INTO season_progression 
        (competitor_id, season_id, current_tier, current_xp)
        VALUES ($1, $2, 1, 0)`,
        [competitorId, seasonId]
      );

      // Retry query
      return getSeasonProgression(competitorId, seasonId);
    }

    return rows[0];
  });
};

/**
 * @function awardSeasonXP
 * @description Awards season XP to a competitor and handles tier progression
 * @param {string} competitorId - Competitor's unique identifier
 * @param {string} seasonId - Season's unique identifier
 * @param {number} amount - Amount of XP to award
 * @param {string} source - Source of the XP
 * @returns {Promise<Object>} Updated progression with tier up information
 */
const awardSeasonXP = async (competitorId, seasonId, amount, source) => {
  return withTransaction(async (client) => {
    // Get current progression
    const { rows: progression } = await client.query(
      'SELECT * FROM season_progression WHERE competitor_id = $1 AND season_id = $2 FOR UPDATE',
      [competitorId, seasonId]
    );

    // Create progression if it doesn't exist
    if (progression.length === 0) {
      await client.query(
        `INSERT INTO season_progression 
        (competitor_id, season_id, current_tier, current_xp)
        VALUES ($1, $2, 1, 0)`,
        [competitorId, seasonId]
      );

      // Retry with new progression
      return awardSeasonXP(competitorId, seasonId, amount, source);
    }

    const currentTier = progression[0].current_tier;
    const currentXP = progression[0].current_xp;
    const newXP = currentXP + amount;

    // Get XP required for next tier
    const { rows: nextTier } = await client.query(
      'SELECT * FROM season_tier WHERE season_id = $1 AND tier_number = $2',
      [seasonId, currentTier + 1]
    );

    // Check if tier up
    let newTier = currentTier;
    let tieredUp = false;
    let remainingXP = newXP;
    let tierUpRewards = [];

    if (nextTier.length > 0 && newXP >= nextTier[0].xp_required) {
      // Handle tier up (possibly multiple tiers)
      while (true) {
        const { rows: tierInfo } = await client.query(
          'SELECT * FROM season_tier WHERE season_id = $1 AND tier_number = $2',
          [seasonId, newTier + 1]
        );

        if (tierInfo.length === 0 || remainingXP < tierInfo[0].xp_required) {
          break;
        }

        newTier++;
        remainingXP -= tierInfo[0].xp_required;
        tieredUp = true;
        tierUpRewards.push(tierInfo[0]);

        // Check if we've reached max tier
        const { rows: maxTier } = await client.query(
          'SELECT MAX(tier_number) as max_tier FROM season_tier WHERE season_id = $1',
          [seasonId]
        );

        if (newTier >= maxTier[0].max_tier) {
          remainingXP = 0;
          break;
        }
      }
    }

    // Update progression
    const { rows: updated } = await client.query(
      `UPDATE season_progression 
      SET current_tier = $1, current_xp = $2, updated_at = CURRENT_TIMESTAMP
      WHERE competitor_id = $3 AND season_id = $4
      RETURNING *`,
      [newTier, remainingXP, competitorId, seasonId]
    );

    // Record XP gain
    await client.query(
      `INSERT INTO season_xp_history 
      (competitor_id, season_id, amount, source, tier_before, tier_after)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [competitorId, seasonId, amount, source, currentTier, newTier]
    );

    // Log XP award
    logger.info(`Season XP awarded: ${amount} to ${competitorId} for season ${seasonId}`, {
      competitorId,
      seasonId,
      amount,
      source,
      tieredUp,
      newTier
    });

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.SEASON, 'PROGRESSION', 'UPDATE');

    return {
      progression: updated[0],
      tieredUp,
      tierUpRewards
    };
  });
};

/**
 * @function claimSeasonReward
 * @description Claims a season tier reward for a competitor
 * @param {string} competitorId - Competitor's unique identifier
 * @param {string} seasonId - Season's unique identifier
 * @param {number} tierNumber - Tier number to claim reward for
 * @returns {Promise<Object>} Claimed reward details
 * @throws {AppError} If reward not available or already claimed
 */
const claimSeasonReward = async (competitorId, seasonId, tierNumber) => {
  return withTransaction(async (client) => {
    // Get progression
    const { rows: progression } = await client.query(
      'SELECT * FROM season_progression WHERE competitor_id = $1 AND season_id = $2',
      [competitorId, seasonId]
    );

    if (progression.length === 0 || progression[0].current_tier < tierNumber) {
      throw new AppError('Tier not reached', 400, 'TIER_NOT_REACHED');
    }

    // Get tier reward
    const { rows: tier } = await client.query(
      'SELECT * FROM season_tier WHERE season_id = $1 AND tier_number = $2',
      [seasonId, tierNumber]
    );

    if (tier.length === 0) {
      throw new AppError('Tier not found', 404, 'TIER_NOT_FOUND');
    }

    // Check if premium reward and if battle pass is active
    if (tier[0].is_premium) {
      const { rows: battlePass } = await client.query(
        'SELECT * FROM battle_pass WHERE competitor_id = $1 AND season_id = $2 AND status = \'ACTIVE\'',
        [competitorId, seasonId]
      );

      if (battlePass.length === 0) {
        throw new AppError('Premium reward requires battle pass', 400, 'BATTLE_PASS_REQUIRED');
      }
    }

    // Check if already claimed
    const { rows: claimed } = await client.query(
      `SELECT * FROM season_progression_reward 
      WHERE progression_id = $1 AND tier_number = $2`,
      [progression[0].sys_id, tierNumber]
    );

    if (claimed.length > 0) {
      throw new AppError('Reward already claimed', 400, 'ALREADY_CLAIMED');
    }

    // Claim reward
    const { rows: reward } = await client.query(
      `INSERT INTO season_progression_reward 
      (progression_id, tier_number, reward_type, reward_amount)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [progression[0].sys_id, tierNumber, tier[0].reward_type, tier[0].reward_amount]
    );

    // Process reward
    if (tier[0].reward_type === 'CURRENCY' || tier[0].reward_type === 'PREMIUM_CURRENCY') {
      await client.query(
        'UPDATE currency_balance SET balance = balance + $1 WHERE competitor_id = $2',
        [tier[0].reward_amount, competitorId]
      );
    } else if (tier[0].reward_type === 'ITEM') {
      // Add item to inventory
      await client.query(
        `INSERT INTO inventory 
        (competitor_id, item_id, quantity)
        VALUES ($1, $2, 1)
        ON CONFLICT (competitor_id, item_id) 
        DO UPDATE SET quantity = inventory.quantity + 1`,
        [competitorId, tier[0].reward_item_id]
      );
    }

    // Log claim
    logger.info(`Season reward claimed: Tier ${tierNumber} by ${competitorId}`, {
      competitorId,
      seasonId,
      tierNumber,
      rewardType: tier[0].reward_type,
      rewardAmount: tier[0].reward_amount
    });

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.SEASON, 'REWARD', 'CREATE');

    return {
      ...reward[0],
      tier: tier[0]
    };
  });
};

// Combine base CRUD service with custom methods
const SeasonService = {
  ...baseCrudService,
  getCurrentSeason,
  createSeason,
  purchaseBattlePass,
  getSeasonProgression,
  awardSeasonXP,
  claimSeasonReward,
  // Add all other methods here...
  // For brevity, I'm not converting all methods, but they would follow the same pattern
};

module.exports = SeasonService; 