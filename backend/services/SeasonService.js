const { pool } = require('../database/connection');
const AppError = require('../utils/appError');

/**
 * @class SeasonService
 * @description Service class handling game seasons, battle passes, competitions,
 * quest chains, and seasonal progression systems
 */
class SeasonService {
  /**
   * @method getCurrentSeason
   * @description Retrieves the currently active season for a game
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @returns {Object} Active season details with statistics and tiers
   * @throws {AppError} If no active season is found
   */
  static async getCurrentSeason(client, gameId) {
    const { rows } = await client.query(`
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
          LEFT JOIN season_pass_progress spp ON s2.sys_id = spp.season_id
          LEFT JOIN season_pass_rewards spr ON spp.sys_id = spr.progress_id
          WHERE s2.sys_id = s.sys_id
          GROUP BY s2.sys_id
        ) as stats,
        (
          SELECT json_agg(json_build_object(
            'tier', st.tier_number,
            'name', st.name,
            'xp_required', st.xp_required,
            'rewards', st.rewards
          ) ORDER BY st.tier_number)
          FROM season_tier st
          WHERE st.season_id = s.sys_id
        ) as tiers
      FROM season s
      WHERE s.game_id = $1 AND s.status = 'ACTIVE'
    `, [gameId]);

    if (rows.length === 0) {
      throw new AppError('No active season found', 404);
    }

    return rows[0];
  }

  /**
   * @method createSeason
   * @description Creates a new season for a game
   * @param {Object} client - Database client
   * @param {Object} seasonData - Season configuration
   * @param {string} seasonData.game_id - Game's unique identifier
   * @param {string} seasonData.name - Season name
   * @param {string} seasonData.description - Season description
   * @param {Date} [seasonData.start_date] - Season start date
   * @param {Date} seasonData.end_date - Season end date
   * @param {boolean} [seasonData.current_season] - Whether this is the current season
   * @param {number} seasonData.battlepass_price - Battle pass price
   * @param {Object} seasonData.rewards_config - Season rewards configuration
   * @param {Object} seasonData.theme_config - Season theme configuration
   * @returns {Object} Created season details
   */
  static async createSeason(client, seasonData) {
    const { rows } = await client.query(
      `INSERT INTO season 
      (game_id, name, description, start_date, end_date, current_season,
       battlepass_price, rewards_config, theme_config)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        seasonData.game_id,
        seasonData.name,
        seasonData.description,
        seasonData.start_date || new Date(),
        seasonData.end_date,
        seasonData.current_season || false,
        seasonData.battlepass_price,
        seasonData.rewards_config,
        seasonData.theme_config
      ]
    );

    return rows[0];
  }

  /**
   * @method getSeasonDetails
   * @description Retrieves detailed information about a season
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @returns {Object} Season details with statistics and tiers
   * @throws {AppError} If season is not found
   */
  static async getSeasonDetails(client, seasonId) {
    const { rows } = await client.query(`
      SELECT 
        s.*,
        g.name as game_name,
        json_build_object(
          'total_participants', COUNT(DISTINCT c.sys_id),
          'battlepass_holders', COUNT(DISTINCT CASE WHEN bp.status = 'ACTIVE' THEN bp.competitor_id END),
          'average_tier', ROUND(AVG(spp.current_tier), 2),
          'total_rewards_claimed', COUNT(DISTINCT spr.sys_id)
        ) as stats,
        (
          SELECT json_agg(json_build_object(
            'tier', st.tier_number,
            'name', st.name,
            'xp_required', st.xp_required,
            'rewards', st.rewards
          ) ORDER BY st.tier_number)
          FROM season_tier st
          WHERE st.season_id = s.sys_id
        ) as tiers
      FROM season s
      JOIN game g ON s.game_id = g.sys_id
      LEFT JOIN competitor c ON s.game_id = c.game_id
      LEFT JOIN battle_pass bp ON s.sys_id = bp.season_id
      LEFT JOIN season_pass_progress spp ON s.sys_id = spp.season_id
      LEFT JOIN season_pass_rewards spr ON spp.sys_id = spr.progress_id
      WHERE s.sys_id = $1
      GROUP BY s.sys_id, g.name`,
      [seasonId]
    );

    if (rows.length === 0) {
      throw new AppError('Season not found', 404);
    }

    return rows[0];
  }

  /**
   * @method updateSeason
   * @description Updates an existing season's configuration
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @param {Object} data - Updated season data
   * @param {string} [data.name] - Season name
   * @param {string} [data.description] - Season description
   * @param {Date} [data.start_date] - Season start date
   * @param {Date} [data.end_date] - Season end date
   * @param {boolean} [data.current_season] - Whether this is the current season
   * @param {number} [data.battlepass_price] - Battle pass price
   * @param {Object} [data.rewards_config] - Season rewards configuration
   * @param {Object} [data.theme_config] - Season theme configuration
   * @returns {Object} Updated season details
   * @throws {AppError} If season is not found or if another active season exists
   */
  static async updateSeason(client, seasonId, data) {
    if (data.current_season) {
      const { rows: activeSeason } = await client.query(
        'SELECT 1 FROM season WHERE game_id = $1 AND current_season = true AND sys_id != $2',
        [data.game_id, seasonId]
      );

      if (activeSeason.length > 0) {
        throw new AppError('A season is already active for this game', 400);
      }
    }

    const { rows } = await client.query(
      `UPDATE season 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        current_season = COALESCE($5, current_season),
        battlepass_price = COALESCE($6, battlepass_price),
        rewards_config = COALESCE($7, rewards_config),
        theme_config = COALESCE($8, theme_config),
        sys_updated_at = CURRENT_TIMESTAMP
      WHERE sys_id = $9
      RETURNING *`,
      [
        data.name,
        data.description,
        data.start_date,
        data.end_date,
        data.current_season,
        data.battlepass_price,
        data.rewards_config,
        data.theme_config,
        seasonId
      ]
    );

    if (rows.length === 0) {
      throw new AppError('Season not found', 404);
    }

    return rows[0];
  }

  /**
   * @method endSeason
   * @description Ends an active season and archives its data
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @returns {Object} Ended season details
   * @throws {AppError} If season is not found or already ended
   */
  static async endSeason(client, seasonId) {
    const { rows } = await client.query(
      `UPDATE season 
      SET 
        current_season = false,
        end_date = CURRENT_TIMESTAMP,
        sys_updated_at = CURRENT_TIMESTAMP
      WHERE sys_id = $1 AND current_season = true
      RETURNING *`,
      [seasonId]
    );

    if (rows.length === 0) {
      throw new AppError('Season not found or already ended', 404);
    }

    // Archive season progress
    await client.query(
      `INSERT INTO season_archive (season_id, data)
      SELECT 
        $1,
        json_build_object(
          'total_participants', COUNT(DISTINCT sp.competitor_id),
          'battlepass_owners', COUNT(DISTINCT CASE WHEN sp.has_battlepass THEN sp.competitor_id END),
          'tier_distribution', json_object_agg(
            sp.current_tier,
            COUNT(DISTINCT sp.competitor_id)
          ),
          'total_xp_earned', SUM(sp.total_xp),
          'rewards_claimed', COUNT(DISTINCT sr.sys_id),
          'top_performers', (
            SELECT json_agg(top.*)
            FROM (
              SELECT 
                c.sys_id,
                u.user_name,
                sp.current_tier,
                sp.total_xp
              FROM season_progress sp
              JOIN competitor c ON sp.competitor_id = c.sys_id
              JOIN sys_user u ON c.user_id = u.sys_id
              WHERE sp.season_id = $1
              ORDER BY sp.total_xp DESC
              LIMIT 100
            ) top
          )
        )
      FROM season_progress sp
      LEFT JOIN season_reward sr ON sp.season_id = sr.season_id
      WHERE sp.season_id = $1
      GROUP BY sp.season_id`,
      [seasonId]
    );

    return rows[0];
  }

  /**
   * @method createSeasonTier
   * @description Creates a new tier in the season's progression system
   * @param {Object} client - Database client
   * @param {Object} data - Tier configuration
   * @param {string} data.season_id - Season's unique identifier
   * @param {number} data.tier_number - Tier number in sequence
   * @param {string} data.name - Tier name
   * @param {number} data.xp_required - XP required to reach this tier
   * @param {Object} data.rewards - Free tier rewards
   * @param {Object} data.premium_rewards - Premium tier rewards
   * @returns {Object} Created tier details
   */
  static async createSeasonTier(client, data) {
    const { rows } = await client.query(
      `INSERT INTO season_tier 
      (season_id, tier_number, name, xp_required, rewards, premium_rewards)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        data.season_id,
        data.tier_number,
        data.name,
        data.xp_required,
        data.rewards,
        data.premium_rewards
      ]
    );

    // Update max tier in season
    await client.query(
      'UPDATE season SET max_tier = GREATEST(max_tier, $1) WHERE sys_id = $2',
      [data.tier_number, data.season_id]
    );

    return rows[0];
  }

  /**
   * @method getSeasonProgress
   * @description Retrieves a competitor's progress in a season
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Object} Season progress details including tier progress
   */
  static async getSeasonProgress(client, seasonId, competitorId) {
    const { rows } = await client.query(`
      WITH tier_progress AS (
        SELECT 
          st.*,
          sp.total_xp >= st.xp_required as unlocked,
          CASE 
            WHEN sp.total_xp >= st.xp_required THEN 100
            WHEN LAG(st.xp_required) OVER (ORDER BY st.tier_number) IS NULL THEN
              ROUND(sp.total_xp::float / st.xp_required * 100, 2)
            ELSE
              ROUND(
                (sp.total_xp - LAG(st.xp_required) OVER (ORDER BY st.tier_number))::float /
                (st.xp_required - LAG(st.xp_required) OVER (ORDER BY st.tier_number)) * 100,
                2
              )
          END as progress_percentage
        FROM season_tier st
        CROSS JOIN season_progress sp
        WHERE st.season_id = $1 AND sp.competitor_id = $2
      )
      SELECT 
        sp.*,
        s.name as season_name,
        s.end_date,
        json_agg(
          json_build_object(
            'tier_number', tp.tier_number,
            'name', tp.name,
            'xp_required', tp.xp_required,
            'rewards', tp.rewards,
            'premium_rewards', tp.premium_rewards,
            'unlocked', tp.unlocked,
            'progress_percentage', tp.progress_percentage
          )
          ORDER BY tp.tier_number
        ) as tiers,
        json_agg(
          DISTINCT sr.reward_id
        ) FILTER (WHERE sr.sys_id IS NOT NULL) as claimed_rewards
      FROM season_progress sp
      JOIN season s ON sp.season_id = s.sys_id
      LEFT JOIN tier_progress tp ON true
      LEFT JOIN season_reward sr ON sp.season_id = sr.season_id 
        AND sp.competitor_id = sr.competitor_id
      WHERE sp.season_id = $1 AND sp.competitor_id = $2
      GROUP BY sp.sys_id, s.name, s.end_date`,
      [seasonId, competitorId]
    );

    if (rows.length === 0) {
      throw new AppError('Season progress not found', 404);
    }

    return rows[0];
  }

  /**
   * @method purchaseBattlePass
   * @description Purchases a battle pass for a competitor in a season
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Object} Battle pass purchase details
   * @throws {AppError} If battle pass already owned or insufficient funds
   */
  static async purchaseBattlePass(client, seasonId, competitorId) {
    const { rows } = await client.query(
      `INSERT INTO battle_pass 
      (season_id, competitor_id, status)
      VALUES ($1, $2, 'ACTIVE')
      RETURNING *`,
      [seasonId, competitorId]
    );

    return rows[0];
  }

  /**
   * @method addSeasonXP
   * @description Adds XP to a competitor's season progress
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @param {string} competitorId - Competitor's unique identifier
   * @param {number} xpAmount - Amount of XP to add
   * @param {string} source - Source of the XP gain
   * @returns {Object} Updated progress details
   */
  static async addSeasonXP(client, seasonId, competitorId, xpAmount, source) {
    // Get current progress
    const { rows: currentProgress } = await client.query(
      'SELECT * FROM season_progress WHERE season_id = $1 AND competitor_id = $2 FOR UPDATE',
      [seasonId, competitorId]
    );

    if (currentProgress.length === 0) {
      // Initialize progress if not exists
      const { rows } = await client.query(
        `INSERT INTO season_progress 
        (season_id, competitor_id, current_tier, total_xp)
        VALUES ($1, $2, 0, $3)
        RETURNING *`,
        [seasonId, competitorId, xpAmount]
      );
      return rows[0];
    }

    // Update progress
    const { rows: updatedProgress } = await client.query(
      `UPDATE season_progress 
      SET 
        total_xp = total_xp + $1,
        current_tier = (
          SELECT COUNT(*)
          FROM season_tier st
          WHERE st.season_id = $2
            AND st.xp_required <= (total_xp + $1)
        ),
        sys_updated_at = CURRENT_TIMESTAMP
      WHERE season_id = $2 AND competitor_id = $3
      RETURNING *`,
      [xpAmount, seasonId, competitorId]
    );

    // Record XP gain
    await client.query(
      `INSERT INTO season_xp_history 
      (season_id, competitor_id, amount, source)
      VALUES ($1, $2, $3, $4)`,
      [seasonId, competitorId, xpAmount, source]
    );

    return updatedProgress[0];
  }

  /**
   * @method claimTierReward
   * @description Claims rewards for reaching a season tier
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} tierId - Tier's unique identifier
   * @param {boolean} [isPremium=false] - Whether to claim premium rewards
   * @returns {Object} Claimed rewards details
   * @throws {AppError} If tier not reached or rewards already claimed
   */
  static async claimTierReward(client, seasonId, competitorId, tierId, isPremium = false) {
    // Get tier details
    const { rows: tier } = await client.query(
      'SELECT * FROM season_tier WHERE sys_id = $1',
      [tierId]
    );

    if (tier.length === 0) {
      throw new AppError('Tier not found', 404);
    }

    // Verify progress
    const { rows: progress } = await client.query(
      'SELECT * FROM season_progress WHERE season_id = $1 AND competitor_id = $2',
      [seasonId, competitorId]
    );

    if (progress.length === 0 || progress[0].current_tier < tier[0].tier_number) {
      throw new AppError('Tier not unlocked', 400);
    }

    if (isPremium && !progress[0].has_battlepass) {
      throw new AppError('Battle Pass required for premium rewards', 400);
    }

    // Check if already claimed
    const { rows: claimed } = await client.query(
      `SELECT 1 FROM season_reward 
      WHERE season_id = $1 AND competitor_id = $2 AND tier_id = $3 AND is_premium = $4`,
      [seasonId, competitorId, tierId, isPremium]
    );

    if (claimed.length > 0) {
      throw new AppError('Reward already claimed', 400);
    }

    // Claim reward
    const { rows: reward } = await client.query(
      `INSERT INTO season_reward 
      (season_id, competitor_id, tier_id, is_premium, reward_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        seasonId,
        competitorId,
        tierId,
        isPremium,
        isPremium ? tier[0].premium_rewards : tier[0].rewards
      ]
    );

    return reward[0];
  }

  /**
   * @method getSeasonLeaderboard
   * @description Retrieves the season's leaderboard with pagination
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @param {Object} options - Leaderboard options
   * @param {number} [options.limit=100] - Number of entries to return
   * @param {number} [options.offset=0] - Number of entries to skip
   * @returns {Array<Object>} Leaderboard entries
   */
  static async getSeasonLeaderboard(client, seasonId, { limit = 100, offset = 0 }) {
    const { rows } = await client.query(`
      SELECT 
        spp.*,
        u.user_name,
        u.avatar_url,
        t.name as team_name,
        RANK() OVER (ORDER BY spp.total_xp DESC) as rank,
        json_build_object(
          'current_tier', spp.current_tier,
          'total_xp', spp.total_xp,
          'rewards_claimed', COUNT(DISTINCT spr.sys_id),
          'has_battlepass', spp.has_battlepass
        ) as stats
      FROM season_pass_progress spp
      JOIN competitor c ON spp.competitor_id = c.sys_id
      JOIN sys_user u ON c.user_id = u.sys_id
      LEFT JOIN team_member tm ON c.sys_id = tm.competitor_id
      LEFT JOIN team t ON tm.team_id = t.sys_id
      LEFT JOIN season_pass_rewards spr ON spp.season_id = spr.season_id 
        AND spp.competitor_id = spr.competitor_id
      WHERE spp.season_id = $1
      GROUP BY spp.sys_id, spp.total_xp, spp.current_tier, spp.has_battlepass,
               u.user_name, u.avatar_url, t.name
      ORDER BY spp.total_xp DESC
      LIMIT $2 OFFSET $3`,
      [seasonId, limit, offset]
    );

    return rows;
  }

  // Competition functions
  /**
   * @method createCompetition
   * @description Creates a new competition within a season
   * @param {Object} client - Database client
   * @param {Object} competitionData - Competition configuration
   * @returns {Object} Created competition details
   */
  static async createCompetition(client, competitionData) {
    const { rows } = await client.query(
      `INSERT INTO competition 
      (season_id, name, type, start_date, end_date, rules, prize_pool)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        competitionData.season_id,
        competitionData.name,
        competitionData.type,
        competitionData.start_date,
        competitionData.end_date,
        competitionData.rules,
        competitionData.prize_pool
      ]
    );

    return rows[0];
  }

  /**
   * @method joinCompetition
   * @description Registers a competitor for a competition
   * @param {Object} client - Database client
   * @param {string} competitionId - Competition's unique identifier
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Object} Competition entry details
   * @throws {AppError} If already joined or competition full
   */
  static async joinCompetition(client, competitionId, competitorId) {
    const { rows } = await client.query(
      `INSERT INTO competition_participant 
      (competition_id, competitor_id)
      VALUES ($1, $2)
      RETURNING *`,
      [competitionId, competitorId]
    );

    return rows[0];
  }

  // Battle Pass functions
  /**
   * @method claimSeasonRewards
   * @description Claims all available rewards for a competitor in a season
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} tierId - Tier's unique identifier
   * @returns {Object} Claimed rewards summary
   */
  static async claimSeasonRewards(client, seasonId, competitorId, tierId) {
    const { rows: tier } = await client.query(
      `SELECT * FROM season_tier 
      WHERE season_id = $1 AND tier_number = $2`,
      [seasonId, tierId]
    );

    if (tier.length === 0) {
      throw new AppError('Tier not found', 404);
    }

    const { rows: progress } = await client.query(
      `SELECT * FROM season_pass_progress 
      WHERE season_id = $1 AND competitor_id = $2`,
      [seasonId, competitorId]
    );

    if (progress.length === 0 || progress[0].current_tier < tier[0].tier_number) {
      throw new AppError('Tier not unlocked', 400);
    }

    const { rows: reward } = await client.query(
      `INSERT INTO season_pass_rewards 
      (season_id, competitor_id, tier_id, reward_data)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        seasonId,
        competitorId,
        tierId,
        tier[0].rewards
      ]
    );

    return reward[0];
  }

  // Quest Chain System
  /**
   * @method startQuestChain
   * @description Initiates a quest chain for a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} chainId - Quest chain's unique identifier
   * @returns {Object} Quest chain progress details
   * @throws {AppError} If chain already started or prerequisites not met
   */
  static async startQuestChain(client, competitorId, chainId) {
    // Verify quest chain exists and is available
    const { rows: [chain] } = await client.query(
      `SELECT * FROM quest_chain 
      WHERE sys_id = $1 AND status = 'ACTIVE'`,
      [chainId]
    );

    if (!chain) {
      throw new AppError('Quest chain not found or inactive', 404);
    }

    // Get first quest in chain
    const { rows: [firstQuest] } = await client.query(
      `SELECT * FROM quest 
      WHERE chain_id = $1 
      ORDER BY sequence_order ASC 
      LIMIT 1`,
      [chainId]
    );

    // Start quest chain progression
    const { rows: [progression] } = await client.query(
      `INSERT INTO quest_progression 
      (competitor_id, quest_id, chain_id, status, started_at)
      VALUES ($1, $2, $3, 'IN_PROGRESS', CURRENT_TIMESTAMP)
      RETURNING *`,
      [competitorId, firstQuest.sys_id, chainId]
    );

    return {
      chain,
      currentQuest: firstQuest,
      progression
    };
  }

  /**
   * @method getQuestChainProgress
   * @description Retrieves progress in a quest chain
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} chainId - Quest chain's unique identifier
   * @returns {Object} Quest chain progress details
   */
  static async getQuestChainProgress(client, competitorId, chainId) {
    const { rows } = await client.query(`
      SELECT 
        qc.*,
        json_agg(
          json_build_object(
            'quest_id', q.sys_id,
            'name', q.name,
            'sequence_order', q.sequence_order,
            'status', COALESCE(qp.status, 'NOT_STARTED'),
            'progress', qp.progress,
            'completed_at', qp.completed_at
          ) ORDER BY q.sequence_order
        ) as quests,
        json_build_object(
          'current_quest', MAX(CASE WHEN qp.status = 'IN_PROGRESS' THEN q.sequence_order END),
          'completed_quests', COUNT(CASE WHEN qp.status = 'COMPLETED' THEN 1 END),
          'total_quests', COUNT(q.sys_id)
        ) as stats
      FROM quest_chain qc
      JOIN quest q ON qc.sys_id = q.chain_id
      LEFT JOIN quest_progression qp ON q.sys_id = qp.quest_id 
        AND qp.competitor_id = $1
      WHERE qc.sys_id = $2
      GROUP BY qc.sys_id`,
      [competitorId, chainId]
    );

    return rows[0];
  }

  // Quest Objective System
  /**
   * @method trackObjectiveProgress
   * @description Updates progress on a quest objective
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} objectiveId - Objective's unique identifier
   * @param {number} progress - Current progress value
   * @returns {Object} Updated objective progress
   */
  static async trackObjectiveProgress(client, competitorId, objectiveId, progress) {
    const { rows: [objective] } = await client.query(
      `SELECT 
        qo.*,
        q.chain_id,
        q.sequence_order
      FROM quest_objective qo
      JOIN quest q ON qo.quest_id = q.sys_id
      WHERE qo.sys_id = $1`,
      [objectiveId]
    );

    if (!objective) {
      throw new AppError('Objective not found', 404);
    }

    // Update objective progress
    const { rows: [tracking] } = await client.query(
      `INSERT INTO objective_progress 
      (competitor_id, objective_id, progress, last_updated)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (competitor_id, objective_id) 
      DO UPDATE SET 
        progress = EXCLUDED.progress,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *`,
      [competitorId, objectiveId, progress]
    );

    // Check if all objectives are completed for the quest
    const { rows: [questProgress] } = await client.query(`
      SELECT 
        q.sys_id as quest_id,
        bool_and(op.progress >= qo.required_progress) as all_completed
      FROM quest q
      JOIN quest_objective qo ON q.sys_id = qo.quest_id
      JOIN objective_progress op ON qo.sys_id = op.objective_id
      WHERE q.sys_id = $1 AND op.competitor_id = $2
      GROUP BY q.sys_id`,
      [objective.quest_id, competitorId]
    );

    if (questProgress?.all_completed) {
      await this.completeQuest(client, competitorId, objective.quest_id);
    }

    return tracking;
  }

  /**
   * @method getObjectiveProgress
   * @description Retrieves progress on quest objectives
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} questId - Quest's unique identifier
   * @returns {Array<Object>} Objective progress details
   */
  static async getObjectiveProgress(client, competitorId, questId) {
    const { rows } = await client.query(`
      SELECT 
        qo.*,
        op.progress,
        op.last_updated,
        json_build_object(
          'required_progress', qo.required_progress,
          'completion_percentage', 
          ROUND((COALESCE(op.progress, 0) / NULLIF(qo.required_progress, 0)) * 100, 2)
        ) as stats
      FROM quest_objective qo
      LEFT JOIN objective_progress op ON qo.sys_id = op.objective_id 
        AND op.competitor_id = $1
      WHERE qo.quest_id = $2
      ORDER BY qo.sequence_order`,
      [competitorId, questId]
    );

    return rows;
  }

  // Enhanced Leaderboard System
  /**
   * @method getLeaderboardByType
   * @description Retrieves a specialized leaderboard for a season
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @param {string} type - Type of leaderboard
   * @param {string} [timeframe='ALL_TIME'] - Time period for rankings
   * @returns {Array<Object>} Leaderboard entries
   */
  static async getLeaderboardByType(client, seasonId, type, timeframe = 'ALL_TIME') {
    let timeFilter = '';
    switch (timeframe) {
      case 'DAILY':
        timeFilter = 'AND date_trunc(\'day\', le.created_at) = current_date';
        break;
      case 'WEEKLY':
        timeFilter = 'AND date_trunc(\'week\', le.created_at) = date_trunc(\'week\', current_date)';
        break;
      case 'MONTHLY':
        timeFilter = 'AND date_trunc(\'month\', le.created_at) = date_trunc(\'month\', current_date)';
        break;
    }

    const { rows } = await client.query(`
      WITH RankedEntries AS (
        SELECT 
          le.*,
          u.user_name,
          u.avatar_url,
          t.name as team_name,
          RANK() OVER (
            PARTITION BY le.leaderboard_id 
            ORDER BY le.score DESC
          ) as rank
        FROM leaderboard_entry le
        JOIN competitor c ON le.competitor_id = c.sys_id
        JOIN sys_user u ON c.user_id = u.sys_id
        LEFT JOIN team_member tm ON c.sys_id = tm.competitor_id
        LEFT JOIN team t ON tm.team_id = t.sys_id
        WHERE le.season_id = $1 
        AND le.type = $2
        ${timeFilter}
      )
      SELECT 
        r.*,
        json_build_object(
          'percentile', 
          ROUND(
            (COUNT(*) OVER () - rank::float) / NULLIF(COUNT(*) OVER (), 0) * 100,
            2
          ),
          'total_participants', COUNT(*) OVER ()
        ) as stats
      FROM RankedEntries r
      ORDER BY r.rank ASC
      LIMIT 100`,
      [seasonId, type]
    );

    return rows;
  }

  /**
   * @method updateLeaderboardEntries
   * @description Updates multiple leaderboard entries in batch
   * @param {Object} client - Database client
   * @param {string} seasonId - Season's unique identifier
   * @param {Array<Object>} entries - Leaderboard entries to update
   * @returns {Array<Object>} Updated entries
   */
  static async updateLeaderboardEntries(client, seasonId, entries) {
    const { rows } = await client.query(
      `INSERT INTO leaderboard_entry 
      (season_id, competitor_id, type, score, metadata)
      SELECT 
        $1,
        e.competitor_id,
        e.type,
        e.score,
        e.metadata
      FROM jsonb_to_recordset($2) AS e(
        competitor_id uuid,
        type text,
        score integer,
        metadata jsonb
      )
      ON CONFLICT (season_id, competitor_id, type) 
      DO UPDATE SET 
        score = EXCLUDED.score,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [seasonId, JSON.stringify(entries)]
    );

    return rows;
  }
}

module.exports = SeasonService; 