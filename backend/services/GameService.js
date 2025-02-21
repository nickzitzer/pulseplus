const { pool } = require('../db');
const AppError = require('../utils/appError');
const { withTransaction } = require('../utils/routeHelpers');

/**
 * @class GameService
 * @description Service class handling game management, progression, achievements, and competitive features
 */
class GameService {
  /**
   * @method createGame
   * @description Creates a new game with specified configuration
   * @param {Object} client - Database client
   * @param {Object} gameData - Game configuration data
   * @param {string} gameData.name - Game name
   * @param {string} gameData.description - Game description
   * @param {string} gameData.gamemaster - Gamemaster's ID
   * @param {string} gameData.primary_color - Primary theme color
   * @param {string} gameData.secondary_color - Secondary theme color
   * @param {string} gameData.currency_name - In-game currency name
   * @param {number} gameData.currency_conversion - Currency conversion rate
   * @param {boolean} gameData.is_active - Game activation status
   * @param {number} gameData.advance_percentage - Required percentage to advance
   * @returns {Object} Created game details
   */
  static async createGame(client, gameData) {
    const { rows } = await client.query(
      `INSERT INTO game 
      (name, description, gamemaster, primary_color, secondary_color, 
       currency_name, currency_conversion, is_active, advance_percentage)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        gameData.name,
        gameData.description,
        gameData.gamemaster,
        gameData.primary_color,
        gameData.secondary_color,
        gameData.currency_name,
        gameData.currency_conversion,
        gameData.is_active,
        gameData.advance_percentage
      ]
    );

    return rows[0];
  }

  /**
   * @method getGameDetails
   * @description Retrieves detailed game information including statistics
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @returns {Object} Game details with comprehensive statistics
   * @throws {AppError} If game not found
   */
  static async getGameDetails(client, gameId) {
    const { rows } = await client.query(`
      SELECT 
        g.*,
        (
          SELECT json_build_object(
            'total_competitors', COUNT(DISTINCT c.sys_id),
            'total_teams', COUNT(DISTINCT t.sys_id),
            'total_achievements', COUNT(DISTINCT a.sys_id),
            'total_quests', COUNT(DISTINCT q.sys_id),
            'total_powerups', COUNT(DISTINCT p.sys_id),
            'total_badges', COUNT(DISTINCT b.sys_id),
            'active_competitions', COUNT(DISTINCT CASE WHEN comp.status = 'ACTIVE' THEN comp.sys_id END),
            'currency_circulation', COALESCE(SUM(cb.balance), 0),
            'avg_level', ROUND(AVG(c.level), 2),
            'engagement_rate', ROUND(
              COUNT(DISTINCT CASE WHEN c.last_active > NOW() - INTERVAL '7 days' THEN c.sys_id END)::float / 
              NULLIF(COUNT(DISTINCT c.sys_id), 0) * 100,
              2
            )
          )
          FROM competitor c
          LEFT JOIN team t ON c.game_id = t.game_id
          LEFT JOIN achievement a ON c.game_id = a.game_id
          LEFT JOIN quest q ON c.game_id = q.game_id
          LEFT JOIN powerup p ON c.game_id = p.game_id
          LEFT JOIN badge b ON c.game_id = b.game_id
          LEFT JOIN competition comp ON c.game_id = comp.game_id
          LEFT JOIN currency_balance cb ON c.sys_id = cb.competitor_id
          WHERE c.game_id = g.sys_id
        ) as stats
      FROM game g
      WHERE g.sys_id = $1`,
      [gameId]
    );

    if (rows.length === 0) {
      throw new AppError('Game not found', 404);
    }

    return rows[0];
  }
  
  /**
   * @method getPlayerProgress
   * @description Retrieves a player's progression details in a game
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Object} Player progression details including level information
   */
  static async getPlayerProgress(client, competitorId) {
    const { rows } = await client.query(`
      SELECT 
        c.*,
        json_build_object(
          'level', l.level_number,
          'xp_required', l.xp_required,
          'next_level', (
            SELECT json_build_object(
              'level_number', next_l.level_number,
              'xp_required', next_l.xp_required
            )
            FROM level next_l
            WHERE next_l.game_id = c.game_id
              AND next_l.level_number = c.level + 1
          )
        ) as progression
      FROM competitor c
      JOIN level l ON c.game_id = l.game_id AND c.level = l.level_number
      WHERE c.sys_id = $1`,
      [competitorId]
    );

    return rows[0];
  }

  /**
   * @method levelUp
   * @description Processes a player's level up in the game
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Object} Updated level information
   */
  static async levelUp(client, competitorId) {
    // Implementation needed
  }
  
  /**
   * @method awardAchievement
   * @description Awards an achievement to a player
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} achievementId - Achievement to award
   * @returns {Object} Created achievement record
   */
  static async awardAchievement(client, competitorId, achievementId) {
    const { rows } = await client.query(
      `INSERT INTO competitor_achievement 
      (competitor_id, achievement_id)
      VALUES ($1, $2)
      RETURNING *`,
      [competitorId, achievementId]
    );

    return rows[0];
  }

  /**
   * @method getAchievements
   * @description Retrieves all achievements for a game or player
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {string} [competitorId] - Optional competitor ID to filter achievements
   * @returns {Array<Object>} List of achievements with completion status
   */
  static async getAchievements(client, gameId, competitorId) {
    // Implementation needed
  }
  
  /**
   * @method startQuest
   * @description Initiates a quest for a player
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} questId - Quest to start
   * @returns {Object} Created quest progression record
   */
  static async startQuest(client, competitorId, questId) {
    const { rows } = await client.query(
      `INSERT INTO quest_progression 
      (competitor_id, quest_id, status)
      VALUES ($1, $2, 'IN_PROGRESS')
      RETURNING *`,
      [competitorId, questId]
    );

    return rows[0];
  }

  /**
   * @method completeQuest
   * @description Marks a quest as completed and awards rewards
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} questId - Quest to complete
   * @returns {Object} Updated quest progression and rewards
   */
  static async completeQuest(client, competitorId, questId) {
    // Implementation needed
  }
  
  /**
   * @method getLeaderboard
   * @description Retrieves game leaderboard with various filtering options
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {string} [type='OVERALL'] - Leaderboard type
   * @param {string} [timeframe='ALL_TIME'] - Time period for rankings
   * @param {number} [limit=100] - Number of entries to return
   * @returns {Array<Object>} Ranked list of competitors with stats
   */
  static async getLeaderboard(client, gameId, type = 'OVERALL', timeframe = 'ALL_TIME', limit = 100) {
    let query = `
      SELECT 
        c.sys_id as competitor_id,
        u.user_name,
        u.avatar_url,
        c.level,
        c.total_points as score,
        t.name as team_name,
        RANK() OVER (ORDER BY c.total_points DESC) as rank,
        json_build_object(
          'achievements', COUNT(DISTINCT ca.achievement_id),
          'badges', COUNT(DISTINCT cb.badge_id),
          'quests_completed', COUNT(DISTINCT CASE WHEN qp.status = 'COMPLETED' THEN qp.quest_id END)
        ) as stats
      FROM competitor c
      JOIN sys_user u ON c.user_id = u.sys_id
      LEFT JOIN team_member tm ON c.sys_id = tm.competitor_id
      LEFT JOIN team t ON tm.team_id = t.sys_id
      LEFT JOIN competitor_achievement ca ON c.sys_id = ca.competitor_id
      LEFT JOIN competitor_badge cb ON c.sys_id = cb.competitor_id
      LEFT JOIN quest_progression qp ON c.sys_id = qp.competitor_id
      WHERE c.game_id = $1
    `;

    if (timeframe === 'SEASON') {
      query += ` AND c.sys_created_at >= (
        SELECT start_date FROM season 
        WHERE game_id = $1 AND current_season = true
      )`;
    } else if (timeframe === 'MONTHLY') {
      query += ` AND c.sys_created_at >= DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (timeframe === 'WEEKLY') {
      query += ` AND c.sys_created_at >= DATE_TRUNC('week', CURRENT_DATE)`;
    }

    query += `
      GROUP BY c.sys_id, u.user_name, u.avatar_url, t.name
      ORDER BY c.total_points DESC
      LIMIT $2
    `;

    const { rows } = await client.query(query, [gameId, limit]);
    return rows;
  }
  
  /**
   * @method findMatch
   * @description Finds a suitable match for a player based on preferences
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {string} gameId - Game's unique identifier
   * @param {Object} preferences - Matchmaking preferences
   * @param {number} [preferences.level] - Preferred opponent level
   * @returns {Object} Matched competitor details
   */
  static async findMatch(client, userId, gameId, preferences) {
    const { rows } = await client.query(
      `WITH potential_matches AS (
        SELECT 
          c.sys_id as competitor_id,
          c.level,
          c.total_points,
          u.user_name,
          u.avatar_url,
          t.name as team_name
        FROM competitor c
        JOIN sys_user u ON c.user_id = u.sys_id
        LEFT JOIN team_member tm ON c.sys_id = tm.competitor_id
        LEFT JOIN team t ON tm.team_id = t.sys_id
        WHERE c.game_id = $1
          AND c.sys_id != $2
          AND c.status = 'ACTIVE'
      )
      SELECT * FROM potential_matches
      ORDER BY ABS(level - $3) ASC
      LIMIT 1`,
      [gameId, userId, preferences.level || 1]
    );

    return rows[0];
  }

  /**
   * @method getGameStats
   * @description Retrieves comprehensive game statistics and analytics
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @returns {Object} Detailed game statistics and level distribution
   */
  static async getGameStats(client, gameId) {
    const { rows } = await client.query(`
      SELECT 
        g.*,
        (
          SELECT json_build_object(
            'total_competitors', COUNT(DISTINCT c.sys_id),
            'total_teams', COUNT(DISTINCT t.sys_id),
            'total_achievements', COUNT(DISTINCT a.sys_id),
            'total_quests', COUNT(DISTINCT q.sys_id),
            'total_powerups', COUNT(DISTINCT p.sys_id),
            'total_badges', COUNT(DISTINCT b.sys_id),
            'active_competitions', COUNT(DISTINCT CASE WHEN comp.status = 'ACTIVE' THEN comp.sys_id END),
            'currency_circulation', COALESCE(SUM(cb.balance), 0),
            'avg_level', ROUND(AVG(c.level), 2),
            'engagement_rate', ROUND(
              COUNT(DISTINCT CASE WHEN c.last_active > NOW() - INTERVAL '7 days' THEN c.sys_id END)::float / 
              NULLIF(COUNT(DISTINCT c.sys_id), 0) * 100,
              2
            )
          )
          FROM competitor c
          LEFT JOIN team t ON c.game_id = t.game_id
          LEFT JOIN achievement a ON c.game_id = a.game_id
          LEFT JOIN quest q ON c.game_id = q.game_id
          LEFT JOIN powerup p ON c.game_id = p.game_id
          LEFT JOIN badge b ON c.game_id = b.game_id
          LEFT JOIN competition comp ON c.game_id = comp.game_id
          LEFT JOIN currency_balance cb ON c.sys_id = cb.competitor_id
          WHERE c.game_id = g.sys_id
        ) as stats,
        (
          SELECT json_agg(json_build_object(
            'level', l.level_number,
            'total_competitors', COUNT(DISTINCT c.sys_id),
            'completion_rate', ROUND(
              COUNT(DISTINCT CASE WHEN c.level >= l.level_number THEN c.sys_id END)::float / 
              NULLIF(COUNT(DISTINCT c.sys_id), 0) * 100,
              2
            )
          ))
          FROM level l
          LEFT JOIN competitor c ON l.game_id = c.game_id
          WHERE l.game_id = g.sys_id
          GROUP BY l.level_number
          ORDER BY l.level_number
        ) as level_distribution
      FROM game g
      WHERE g.sys_id = $1
      GROUP BY g.sys_id
    `, [gameId]);

    if (rows.length === 0) {
      throw new AppError('Game not found', 404);
    }

    return rows[0];
  }

  /**
   * @method getGameState
   * @description Retrieves current game state including active events and conditions
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @returns {Object} Current game state and active conditions
   */
  static async getGameState(client, gameId) {
    const { rows } = await client.query(`
      SELECT 
        g.*,
        (
          SELECT json_build_object(
            'current_season', s.name,
            'season_end', s.end_date,
            'active_competitions', COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.sys_id END),
            'active_quests', COUNT(DISTINCT CASE WHEN q.status = 'ACTIVE' THEN q.sys_id END)
          )
          FROM game g2
          LEFT JOIN season s ON g2.sys_id = s.game_id AND s.current_season = true
          LEFT JOIN competition c ON g2.sys_id = c.game_id AND c.status = 'ACTIVE'
          LEFT JOIN quest q ON g2.sys_id = q.game_id AND q.status = 'ACTIVE'
          WHERE g2.sys_id = g.sys_id
          GROUP BY s.name, s.end_date
        ) as current_state
      FROM game g
      WHERE g.sys_id = $1
    `, [gameId]);

    if (rows.length === 0) {
      throw new AppError('Game not found', 404);
    }

    return rows[0];
  }

  /**
   * @method joinGame
   * @description Registers a new competitor in a game
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {string} userId - User joining the game
   * @returns {Object} Created competitor record
   * @throws {AppError} If user already joined or game is inactive
   */
  static async joinGame(client, gameId, userId) {
    // Check if user is already a competitor
    const { rows: existingCompetitor } = await client.query(
      'SELECT 1 FROM competitor WHERE game_id = $1 AND user_id = $2',
      [gameId, userId]
    );

    if (existingCompetitor.length > 0) {
      throw new AppError('User is already a competitor in this game', 400);
    }

    // Get game details
    const { rows: game } = await client.query(
      'SELECT * FROM game WHERE sys_id = $1',
      [gameId]
    );

    if (game.length === 0) {
      throw new AppError('Game not found', 404);
    }

    if (!game[0].is_active) {
      throw new AppError('Game is not active', 400);
    }

    // Create competitor
    const { rows: competitor } = await client.query(
      `INSERT INTO competitor 
      (user_id, game_id, level, total_points, status)
      VALUES ($1, $2, 1, 0, 'ACTIVE')
      RETURNING *`,
      [userId, gameId]
    );

    // Initialize currency balance
    await client.query(
      `INSERT INTO currency_balance 
      (competitor_id, currency_type, balance)
      VALUES ($1, $2, 0)`,
      [competitor[0].sys_id, game[0].currency_name]
    );

    return competitor[0];
  }

  /**
   * @method updateGameConfiguration
   * @description Updates game settings and configuration
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {Object} config - Updated configuration
   * @returns {Object} Updated game configuration
   */
  static async updateGameConfiguration(client, gameId, config) {
    const { rows } = await client.query(
      `UPDATE game 
      SET 
        primary_color = COALESCE($1, primary_color),
        secondary_color = COALESCE($2, secondary_color),
        currency_name = COALESCE($3, currency_name),
        currency_conversion = COALESCE($4, currency_conversion),
        advance_percentage = COALESCE($5, advance_percentage),
        sys_updated_at = CURRENT_TIMESTAMP
      WHERE sys_id = $6
      RETURNING *`,
      [
        config.primary_color,
        config.secondary_color,
        config.currency_name,
        config.currency_conversion,
        config.advance_percentage,
        gameId
      ]
    );

    if (rows.length === 0) {
      throw new AppError('Game not found', 404);
    }

    return rows[0];
  }

  /**
   * @method trackAchievementProgress
   * @description Updates progress towards an achievement
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} achievementId - Achievement being tracked
   * @param {number} progress - Current progress value
   * @returns {Object} Updated achievement progress
   */
  static async trackAchievementProgress(client, competitorId, achievementId, progress) {
    const { rows: [achievement] } = await client.query(
      `SELECT * FROM achievement WHERE sys_id = $1`,
      [achievementId]
    );

    if (!achievement) {
      throw new AppError('Achievement not found', 404);
    }

    const { rows: [tracking] } = await client.query(
      `INSERT INTO achievement_history 
      (competitor_id, achievement_id, progress, last_updated)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (competitor_id, achievement_id) 
      DO UPDATE SET 
        progress = EXCLUDED.progress,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *`,
      [competitorId, achievementId, progress]
    );

    // Check if achievement is completed
    if (progress >= achievement.target_progress) {
      await this.completeAchievement(client, competitorId, achievementId);
    }

    return tracking;
  }

  /**
   * @method completeAchievement
   * @description Marks an achievement as completed and awards rewards
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} achievementId - Achievement to complete
   * @returns {Object} Completion details and rewards
   */
  static async completeAchievement(client, competitorId, achievementId) {
    const { rows: [completion] } = await client.query(
      `INSERT INTO competitor_achievement 
      (competitor_id, achievement_id, completed_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (competitor_id, achievement_id) DO NOTHING
      RETURNING *`,
      [competitorId, achievementId]
    );

    if (completion) {
      // Grant rewards
      await this.grantAchievementRewards(client, competitorId, achievementId);
    }

    return completion;
  }

  /**
   * @method getAchievementProgress
   * @description Retrieves progress for all achievements in a game
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} gameId - Game's unique identifier
   * @returns {Array<Object>} Achievement progress details
   */
  static async getAchievementProgress(client, competitorId, gameId) {
    const { rows } = await client.query(`
      SELECT 
        a.*,
        ah.progress,
        ah.last_updated,
        ca.completed_at,
        json_build_object(
          'currency', a.reward_currency,
          'xp', a.reward_xp,
          'items', a.reward_items
        ) as rewards
      FROM achievement a
      LEFT JOIN achievement_history ah ON a.sys_id = ah.achievement_id 
        AND ah.competitor_id = $1
      LEFT JOIN competitor_achievement ca ON a.sys_id = ca.achievement_id 
        AND ca.competitor_id = $1
      WHERE a.game_id = $2
      ORDER BY a.difficulty, a.name`,
      [competitorId, gameId]
    );

    return rows;
  }

  // Badge System
  /**
   * @method awardBadge
   * @description Awards a badge to a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} badgeId - Badge to award
   * @returns {Object} Created badge record
   */
  static async awardBadge(client, competitorId, badgeId) {
    const { rows: [badge] } = await client.query(
      `INSERT INTO competitor_badge 
      (competitor_id, badge_id, awarded_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING *`,
      [competitorId, badgeId]
    );

    return badge;
  }

  /**
   * @method getBadges
   * @description Retrieves all badges for a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Array<Object>} List of earned badges
   */
  static async getBadges(client, competitorId) {
    const { rows } = await client.query(`
      SELECT 
        b.*,
        cb.awarded_at,
        json_build_object(
          'total_holders', COUNT(cb2.competitor_id) OVER (PARTITION BY b.sys_id),
          'rarity_percentage', 
          ROUND(
            COUNT(cb2.competitor_id) OVER (PARTITION BY b.sys_id)::float / 
            COUNT(c.sys_id) OVER () * 100,
            2
          )
        ) as stats
      FROM badge b
      LEFT JOIN competitor_badge cb ON b.sys_id = cb.badge_id 
        AND cb.competitor_id = $1
      LEFT JOIN competitor_badge cb2 ON b.sys_id = cb2.badge_id
      CROSS JOIN competitor c
      GROUP BY b.sys_id, cb.awarded_at, cb2.competitor_id`,
      [competitorId]
    );

    return rows;
  }

  // Powerup System
  /**
   * @method activatePowerup
   * @description Activates a powerup for a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} powerupId - Powerup to activate
   * @returns {Object} Activated powerup instance
   * @throws {AppError} If powerup is unavailable or already active
   */
  static async activatePowerup(client, competitorId, powerupId) {
    // Check if powerup is owned
    const { rows: [owned] } = await client.query(
      `SELECT * FROM powerup_instance 
      WHERE competitor_id = $1 AND powerup_id = $2 AND is_active = false`,
      [competitorId, powerupId]
    );

    if (!owned) {
      throw new AppError('Powerup not owned or already active', 400);
    }

    // Get powerup details
    const { rows: [powerup] } = await client.query(
      'SELECT * FROM powerup WHERE sys_id = $1',
      [powerupId]
    );

    // Activate powerup
    const { rows: [instance] } = await client.query(
      `UPDATE powerup_instance 
      SET 
        is_active = true,
        activated_at = CURRENT_TIMESTAMP,
        expires_at = CURRENT_TIMESTAMP + interval '1 second' * $3
      WHERE sys_id = $1
      RETURNING *`,
      [owned.sys_id, powerup.duration]
    );

    return instance;
  }

  /**
   * @method deactivatePowerup
   * @description Deactivates an active powerup instance
   * @param {Object} client - Database client
   * @param {string} instanceId - Powerup instance to deactivate
   * @returns {Object} Deactivated powerup details
   */
  static async deactivatePowerup(client, instanceId) {
    const { rows: [instance] } = await client.query(
      `UPDATE powerup_instance 
      SET 
        is_active = false,
        deactivated_at = CURRENT_TIMESTAMP
      WHERE sys_id = $1
      RETURNING *`,
      [instanceId]
    );

    return instance;
  }

  /**
   * @method getPowerups
   * @description Retrieves all available and active powerups for a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Object} Available and active powerups
   */
  static async getPowerups(client, competitorId) {
    const { rows } = await client.query(`
      SELECT 
        p.*,
        pi.is_active,
        pi.activated_at,
        pi.expires_at,
        json_build_object(
          'total_uses', COUNT(DISTINCT pi2.sys_id),
          'active_instances', COUNT(DISTINCT CASE WHEN pi2.is_active THEN pi2.sys_id END)
        ) as stats
      FROM powerup p
      LEFT JOIN powerup_instance pi ON p.sys_id = pi.powerup_id 
        AND pi.competitor_id = $1
      LEFT JOIN powerup_instance pi2 ON p.sys_id = pi2.powerup_id
      GROUP BY p.sys_id, pi.sys_id`,
      [competitorId]
    );

    return rows;
  }

  // Daily Challenge System
  /**
   * @method getDailyChallenges
   * @description Retrieves active daily challenges for a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} gameId - Game's unique identifier
   * @returns {Array<Object>} Active daily challenges with progress
   */
  static async getDailyChallenges(client, competitorId, gameId) {
    const { rows } = await client.query(`
      SELECT 
        dc.*,
        cp.progress,
        cp.completed_at,
        json_build_object(
          'currency', dc.reward_currency,
          'xp', dc.reward_xp,
          'items', dc.reward_items
        ) as rewards
      FROM daily_challenge dc
      LEFT JOIN challenge_progress cp ON dc.sys_id = cp.challenge_id 
        AND cp.competitor_id = $1
      WHERE dc.game_id = $2 
        AND dc.available_at::date = CURRENT_DATE
      ORDER BY dc.difficulty`,
      [competitorId, gameId]
    );

    return rows;
  }

  /**
   * @method updateChallengeProgress
   * @description Updates progress on a daily challenge
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} challengeId - Challenge being updated
   * @param {number} progress - Current progress value
   * @returns {Object} Updated challenge progress
   */
  static async updateChallengeProgress(client, competitorId, challengeId, progress) {
    const { rows: [challenge] } = await client.query(
      `SELECT * FROM daily_challenge WHERE sys_id = $1`,
      [challengeId]
    );

    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }

    const { rows: [tracking] } = await client.query(
      `INSERT INTO challenge_progress 
      (competitor_id, challenge_id, progress, last_updated)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (competitor_id, challenge_id) 
      DO UPDATE SET 
        progress = EXCLUDED.progress,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *`,
      [competitorId, challengeId, progress]
    );

    // Check if challenge is completed
    if (progress >= challenge.target_progress) {
      await this.completeChallenge(client, competitorId, challengeId);
    }

    return tracking;
  }

  // Social Feed
  /**
   * @method createFeedPost
   * @description Creates a new post in the game feed
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} gameId - Game's unique identifier
   * @param {string} content - Post content
   * @returns {Object} Created feed post
   */
  static async createFeedPost(client, competitorId, gameId, content) {
    const { rows: [post] } = await client.query(
      `INSERT INTO social_feed 
      (competitor_id, game_id, content, type)
      VALUES ($1, $2, $3, 'POST')
      RETURNING *`,
      [competitorId, gameId, content]
    );

    return post;
  }

  /**
   * @method getGameFeed
   * @description Retrieves paginated game feed posts
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {Object} options - Pagination options
   * @param {number} [options.limit=50] - Number of posts to return
   * @param {number} [options.offset=0] - Number of posts to skip
   * @returns {Array<Object>} Feed posts with interaction details
   */
  static async getGameFeed(client, gameId, { limit = 50, offset = 0 }) {
    const { rows } = await client.query(`
      SELECT 
        sf.*,
        u.user_name,
        u.avatar_url,
        json_build_object(
          'likes', COUNT(DISTINCT fl.user_id),
          'comments', COUNT(DISTINCT fc.sys_id)
        ) as engagement
      FROM social_feed sf
      JOIN competitor c ON sf.competitor_id = c.sys_id
      JOIN sys_user u ON c.user_id = u.sys_id
      LEFT JOIN feed_like fl ON sf.sys_id = fl.feed_id
      LEFT JOIN feed_comment fc ON sf.sys_id = fc.feed_id
      WHERE sf.game_id = $1
      GROUP BY sf.sys_id, u.user_name, u.avatar_url
      ORDER BY sf.created_at DESC
      LIMIT $2 OFFSET $3`,
      [gameId, limit, offset]
    );

    return rows;
  }

  /**
   * @method interactWithPost
   * @description Creates an interaction (like, comment) on a feed post
   * @param {Object} client - Database client
   * @param {string} postId - Feed post's unique identifier
   * @param {string} competitorId - Interacting competitor's ID
   * @param {string} type - Type of interaction ('like' or 'comment')
   * @param {string} [content] - Content for comments
   * @returns {Object} Created interaction details
   */
  static async interactWithPost(client, postId, competitorId, type, content) {
    // ... existing code ...
  }

  /**
   * @method getPostInteractions
   * @description Retrieves all interactions for a feed post
   * @param {Object} client - Database client
   * @param {string} postId - Feed post's unique identifier
   * @returns {Object} Post interactions including likes and comments
   */
  static async getPostInteractions(client, postId) {
    // ... existing code ...
  }

  /**
   * @method getGameAnalytics
   * @description Retrieves detailed analytics for a game
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {Object} options - Analytics options
   * @param {string} [options.timeframe='all'] - Time period for analytics
   * @param {string[]} [options.metrics] - Specific metrics to retrieve
   * @returns {Object} Game analytics data
   */
  static async getGameAnalytics(client, gameId, options = {}) {
    // ... existing code ...
  }

  /**
   * @method getCompetitorStats
   * @description Retrieves detailed statistics for a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Object} Competitor statistics and achievements
   */
  static async getCompetitorStats(client, competitorId) {
    // ... existing code ...
  }

  /**
   * @method updateGameStatus
   * @description Updates the status of a game (active, maintenance, ended)
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {string} status - New game status
   * @param {Object} [metadata] - Additional status metadata
   * @returns {Object} Updated game status
   */
  static async updateGameStatus(client, gameId, status, metadata) {
    // ... existing code ...
  }

  /**
   * @method archiveGame
   * @description Archives a game and its associated data
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @returns {Object} Archive operation details
   */
  static async archiveGame(client, gameId) {
    // ... existing code ...
  }

  /**
   * @method getGameHistory
   * @description Retrieves historical data for a game
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {Object} options - History options
   * @param {Date} [options.startDate] - Start date for history
   * @param {Date} [options.endDate] - End date for history
   * @returns {Array<Object>} Historical game data
   */
  static async getGameHistory(client, gameId, options = {}) {
    // ... existing code ...
  }

  /**
   * @method generateGameReport
   * @description Generates a comprehensive report for a game
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {string} reportType - Type of report to generate
   * @returns {Object} Generated report data
   */
  static async generateGameReport(client, gameId, reportType) {
    // ... existing code ...
  }

  /**
   * @method validateGameSettings
   * @description Validates game configuration settings
   * @param {Object} client - Database client
   * @param {Object} settings - Game settings to validate
   * @returns {Object} Validation results and any warnings
   * @throws {AppError} If settings are invalid
   */
  static async validateGameSettings(client, settings) {
    // ... existing code ...
  }

  /**
   * @method migrateGameData
   * @description Migrates game data to a new format or structure
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {string} version - Target version for migration
   * @returns {Object} Migration results
   */
  static async migrateGameData(client, gameId, version) {
    // ... existing code ...
  }
}

module.exports = GameService; 