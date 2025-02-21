const AppError = require('../utils/appError');
const redisClient = require('../config/redis');

/**
 * @class SocialService
 * @description Service class handling all social interactions including friends, teams, chat, and feeds
 */
class SocialService {
  /**
   * @method addFriend
   * @description Creates a new friend request between two users
   * @param {Object} client - Database client
   * @param {string} userId - ID of the user sending the request
   * @param {string} friendId - ID of the user receiving the request
   * @returns {Object} Created friendship record
   * @throws {AppError} If friend request already exists
   */
  static async addFriend(client, userId, friendId) {
    const { rows } = await client.query(
      `INSERT INTO friendship 
      (user_id, friend_id, status)
      VALUES ($1, $2, 'PENDING')
      ON CONFLICT (user_id, friend_id) DO NOTHING
      RETURNING *`,
      [userId, friendId]
    );

    if (rows.length === 0) {
      throw new AppError('Friend request already exists', 400);
    }

    return rows[0];
  }

  /**
   * @method getFriendsList
   * @description Retrieves a user's friends list with detailed statistics
   * @param {Object} client - Database client
   * @param {string} userId - User's ID
   * @returns {Array<Object>} List of friends with their details and shared statistics
   */
  static async getFriendsList(client, userId) {
    const { rows } = await client.query(`
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
  }

  /**
   * @method getPendingFriendRequests
   * @description Retrieves all pending friend requests for a user
   * @param {Object} client - Database client
   * @param {string} userId - User's ID
   * @returns {Array<Object>} List of pending friend requests with user details
   */
  static async getPendingFriendRequests(client, userId) {
    const { rows } = await client.query(`
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
      JOIN sys_user u ON CASE 
        WHEN f.user_id = $1 THEN f.friend_id = u.sys_id
        ELSE f.user_id = u.sys_id
      END
      LEFT JOIN competitor c ON u.sys_id = c.user_id
      LEFT JOIN competitor_achievement ca ON c.sys_id = ca.competitor_id
      WHERE (f.user_id = $1 OR f.friend_id = $1)
        AND f.status = 'PENDING'
      GROUP BY f.sys_id, f.user_id, f.friend_id, f.status, f.created_at,
               u.user_name, u.avatar_url, u.status`,
      [userId]
    );

    return rows;
  }

  /**
   * @method respondToFriendRequest
   * @description Handles accepting or rejecting a friend request
   * @param {Object} client - Database client
   * @param {string} requestId - Friend request ID
   * @param {string} userId - User's ID responding to the request
   * @param {boolean} accept - Whether to accept the request
   * @returns {Object} Updated friendship record
   * @throws {AppError} If request not found or already processed
   */
  static async respondToFriendRequest(client, requestId, userId, accept) {
    const { rows } = await client.query(
      `UPDATE friendship 
      SET 
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE sys_id = $2 
        AND friend_id = $3 
        AND status = 'PENDING'
      RETURNING *`,
      [accept ? 'ACCEPTED' : 'REJECTED', requestId, userId]
    );

    if (rows.length === 0) {
      throw new AppError('Friend request not found or already processed', 404);
    }

    return rows[0];
  }

  /**
   * @method blockUser
   * @description Blocks a user and removes any existing friendship
   * @param {Object} client - Database client
   * @param {string} userId - User doing the blocking
   * @param {string} blockedId - User being blocked
   * @returns {Object} Created block record
   */
  static async blockUser(client, userId, blockedId) {
    // Remove any existing friendship
    await client.query(
      `DELETE FROM friendship 
      WHERE (user_id = $1 AND friend_id = $2)
         OR (user_id = $2 AND friend_id = $1)`,
      [userId, blockedId]
    );

    // Add to blocked list
    const { rows } = await client.query(
      `INSERT INTO blocked_user (user_id, blocked_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, blocked_id) DO NOTHING
      RETURNING *`,
      [userId, blockedId]
    );

    return rows[0];
  }

  /**
   * @method createTeam
   * @description Creates a new team and assigns the creator as leader
   * @param {Object} client - Database client
   * @param {Object} data - Team creation data
   * @param {string} data.name - Team name
   * @param {string} data.description - Team description
   * @param {string} data.game_id - Associated game ID
   * @param {string} data.type - Team type
   * @param {number} data.max_members - Maximum allowed members
   * @param {Object} data.requirements - Team joining requirements
   * @param {Object} data.privacy_settings - Team privacy configuration
   * @param {string} data.creator_id - Team creator's ID
   * @returns {Object} Created team details with members
   */
  static async createTeam(client, data) {
    const { rows: [team] } = await client.query(
      `INSERT INTO team 
      (name, description, game_id, type, max_members, requirements, 
       privacy_settings, recruitment_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.name,
        data.description,
        data.game_id,
        data.type,
        data.max_members,
        data.requirements,
        data.privacy_settings,
        data.recruitment_status || 'OPEN'
      ]
    );

    // Add creator as leader
    await client.query(
      `INSERT INTO team_member 
      (team_id, competitor_id, role, joined_at)
      VALUES ($1, $2, 'LEADER', CURRENT_TIMESTAMP)`,
      [team.sys_id, data.creator_id]
    );

    return this.getTeamDetails(client, team.sys_id);
  }

  /**
   * @method getTeamDetails
   * @description Retrieves detailed team information including members and statistics
   * @param {Object} client - Database client
   * @param {string} teamId - Team's ID
   * @returns {Object} Team details with members and statistics
   * @throws {AppError} If team not found
   */
  static async getTeamDetails(client, teamId) {
    const { rows: [team] } = await client.query(`
      SELECT 
        t.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', tm.competitor_id,
            'role', tm.role,
            'joined_at', tm.joined_at,
            'user_name', u.user_name,
            'avatar_url', u.avatar_url
          )
        ) FILTER (WHERE tm.sys_id IS NOT NULL) as members,
        json_build_object(
          'total_achievements', COUNT(DISTINCT ta.sys_id),
          'total_competitions', COUNT(DISTINCT tc.competition_id),
          'average_level', ROUND(AVG(c.level), 2),
          'activity_score', COUNT(DISTINCT ta2.sys_id) FILTER (
            WHERE ta2.created_at > CURRENT_TIMESTAMP - interval '7 days'
          )
        ) as stats
      FROM team t
      LEFT JOIN team_member tm ON t.sys_id = tm.team_id
      LEFT JOIN competitor c ON tm.competitor_id = c.sys_id
      LEFT JOIN sys_user u ON c.user_id = u.sys_id
      LEFT JOIN team_achievement ta ON t.sys_id = ta.team_id
      LEFT JOIN team_competition tc ON t.sys_id = tc.team_id
      LEFT JOIN team_activity ta2 ON t.sys_id = ta2.team_id
      WHERE t.sys_id = $1
      GROUP BY t.sys_id`,
      [teamId]
    );

    if (!team) {
      throw new AppError('Team not found', 404);
    }

    return team;
  }

  /**
   * @method joinTeam
   * @description Adds a new member to a team
   * @param {Object} client - Database client
   * @param {string} teamId - Team's ID
   * @param {string} competitorId - Joining competitor's ID
   * @returns {Object} Created team membership record
   */
  static async joinTeam(client, teamId, competitorId) {
    const { rows } = await client.query(
      `INSERT INTO team_member 
      (team_id, competitor_id, role)
      VALUES ($1, $2, 'MEMBER')
      RETURNING *`,
      [teamId, competitorId]
    );

    return rows[0];
  }

  /**
   * @method sendMessage
   * @description Sends a new message in a chat group with optional attachments
   * @param {Object} client - Database client
   * @param {string} groupId - Chat group's ID
   * @param {string} userId - Message sender's ID
   * @param {string} content - Message content
   * @param {Array<string>} [attachments=[]] - Array of attachment URLs
   * @returns {Object} Created message record
   * @emits NEW_MESSAGE Redis event for real-time messaging
   */
  static async sendMessage(client, groupId, userId, content, attachments = []) {
    const { rows: message } = await client.query(
      `INSERT INTO chat_message 
      (group_id, user_id, content, attachments)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [groupId, userId, content, attachments]
    );

    // Push to Redis for real-time messaging
    await redisClient.publish(
      `chat:${groupId}`,
      JSON.stringify({
        type: 'NEW_MESSAGE',
        data: message[0]
      })
    );

    return message[0];
  }

  /**
   * @method getChatHistory
   * @description Retrieves paginated chat history with read receipts
   * @param {Object} client - Database client
   * @param {string} groupId - Chat group's ID
   * @param {Object} options - Pagination options
   * @param {number} [options.limit=100] - Number of messages to return
   * @param {number} [options.offset=0] - Number of messages to skip
   * @returns {Array<Object>} List of messages with read receipts
   */
  static async getChatHistory(client, groupId, { limit = 100, offset = 0 }) {
    const { rows } = await client.query(`
      SELECT 
        cm.*,
        u.user_name,
        u.avatar_url,
        json_agg(
          json_build_object(
            'user_id', mr.user_id,
            'read_at', mr.read_at
          )
        ) FILTER (WHERE mr.user_id IS NOT NULL) as read_by
      FROM chat_message cm
      JOIN sys_user u ON cm.user_id = u.sys_id
      LEFT JOIN message_read mr ON cm.sys_id = mr.message_id
      WHERE cm.group_id = $1
      GROUP BY cm.sys_id, u.user_name, u.avatar_url
      ORDER BY cm.created_at DESC
      LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    );

    return rows;
  }

  /**
   * @method markMessagesAsRead
   * @description Marks messages in a chat group as read by a user
   * @param {Object} client - Database client
   * @param {string} groupId - Chat group's ID
   * @param {string} userId - User's ID
   * @param {string} upToMessageId - Last message ID to mark as read
   * @returns {Array<Object>} Updated read receipts
   */
  static async markMessagesAsRead(client, groupId, userId, upToMessageId) {
    const { rows } = await client.query(
      `WITH unread_messages AS (
        SELECT m.sys_id
        FROM chat_message m
        LEFT JOIN message_read mr ON m.sys_id = mr.message_id AND mr.user_id = $1
        WHERE m.group_id = $2
          AND m.created_at <= (SELECT created_at FROM chat_message WHERE sys_id = $3)
          AND mr.message_id IS NULL
      )
      INSERT INTO message_read (message_id, user_id)
      SELECT sys_id, $1
      FROM unread_messages
      RETURNING *`,
      [userId, groupId, upToMessageId]
    );

    return rows;
  }

  /**
   * @method reactToMessage
   * @description Adds or updates a user's reaction to a message
   * @param {Object} client - Database client
   * @param {string} messageId - Message's ID
   * @param {string} userId - User's ID
   * @param {string} emoji - Reaction emoji
   * @returns {Object} Created/updated reaction record
   */
  static async reactToMessage(client, messageId, userId, emoji) {
    const { rows } = await client.query(
      `INSERT INTO message_reaction 
      (message_id, user_id, emoji)
      VALUES ($1, $2, $3)
      ON CONFLICT (message_id, user_id, emoji) DO NOTHING
      RETURNING *`,
      [messageId, userId, emoji]
    );

    return rows[0];
  }

  /**
   * @method createSocialFeed
   * @description Creates a new social feed
   * @param {Object} client - Database client
   * @param {Object} data - Feed creation data
   * @param {string} data.creator_id - Feed creator's ID
   * @param {string} data.type - Feed type
   * @param {Object} data.settings - Feed settings
   * @returns {Object} Created feed details
   */
  static async createSocialFeed(client, data) {
    const { rows } = await client.query(
      `INSERT INTO social_feed 
      (game_id, name, description, type, visibility, moderator_ids)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        data.game_id,
        data.name,
        data.description,
        data.type,
        data.visibility || 'PUBLIC',
        data.moderator_ids || []
      ]
    );

    return rows[0];
  }

  /**
   * @method getFeedItems
   * @description Retrieves paginated feed items with interactions
   * @param {Object} client - Database client
   * @param {string} feedId - Feed's ID
   * @param {Object} options - Pagination options
   * @param {number} [options.limit=50] - Number of items to return
   * @param {number} [options.offset=0] - Number of items to skip
   * @returns {Array<Object>} List of feed items with interaction details
   */
  static async getFeedItems(client, feedId, { limit = 50, offset = 0 }) {
    const { rows } = await client.query(`
      SELECT 
        fi.*,
        u.user_name,
        u.avatar_url,
        json_build_object(
          'likes', COUNT(DISTINCT fl.user_id),
          'comments', COUNT(DISTINCT fc.sys_id)
        ) as stats,
        COALESCE(json_agg(
          json_build_object(
            'id', fc.sys_id,
            'content', fc.content,
            'user_name', comment_user.user_name,
            'created_at', fc.created_at
          )
        ) FILTER (WHERE fc.sys_id IS NOT NULL), '[]') as recent_comments
      FROM feed_item fi
      JOIN sys_user u ON fi.user_id = u.sys_id
      LEFT JOIN feed_like fl ON fi.sys_id = fl.item_id
      LEFT JOIN feed_comment fc ON fi.sys_id = fc.item_id
      LEFT JOIN sys_user comment_user ON fc.user_id = comment_user.sys_id
      WHERE fi.feed_id = $1
      GROUP BY fi.sys_id, fi.content, fi.created_at, u.user_name, u.avatar_url
      ORDER BY fi.created_at DESC
      LIMIT $2 OFFSET $3`,
      [feedId, limit, offset]
    );

    return rows;
  }

  /**
   * @method createFeedItem
   * @description Creates a new item in a social feed
   * @param {Object} client - Database client
   * @param {string} feedId - Feed's ID
   * @param {string} userId - Creator's ID
   * @param {string} content - Item content
   * @param {Array<string>} attachments - Array of attachment URLs
   * @returns {Object} Created feed item
   */
  static async createFeedItem(client, feedId, userId, content, attachments = []) {
    const { rows } = await client.query(
      `INSERT INTO feed_item (feed_id, user_id, content, attachments)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [feedId, userId, content, attachments]
    );

    return rows[0];
  }

  /**
   * @method interactWithFeedItem
   * @description Creates an interaction (like, comment, share) with a feed item
   * @param {Object} client - Database client
   * @param {string} itemId - Feed item's ID
   * @param {string} userId - User's ID
   * @param {string} type - Interaction type
   * @param {string} [content=null] - Interaction content (for comments)
   * @returns {Object} Created interaction record
   */
  static async interactWithFeedItem(client, itemId, userId, type, content = null) {
    if (type === 'LIKE') {
      const { rows } = await client.query(
        `INSERT INTO feed_like (item_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (item_id, user_id) DO NOTHING
        RETURNING *`,
        [itemId, userId]
      );
      return rows[0];
    } else if (type === 'COMMENT') {
      const { rows } = await client.query(
        `INSERT INTO feed_comment (item_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [itemId, userId, content]
      );
      return rows[0];
    }
  }

  /**
   * @method createChatGroup
   * @description Creates a new chat group with initial members
   * @param {Object} client - Database client
   * @param {Object} data - Group creation data
   * @param {string} data.name - Group name
   * @param {string} data.creator_id - Creator's ID
   * @param {Array<string>} data.members - Initial member IDs
   * @param {Object} data.settings - Group settings
   * @returns {Object} Created chat group details
   */
  static async createChatGroup(client, data) {
    const { rows: group } = await client.query(
      `INSERT INTO chat_group 
      (name, type, creator_id, member_ids, is_private)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        data.name,
        data.type,
        data.creator_id,
        data.member_ids,
        data.is_private || false
      ]
    );

    // Add initial members
    await client.query(
      `INSERT INTO chat_member (group_id, user_id, role)
      SELECT $1, unnest($2::uuid[]), 
        CASE WHEN unnest($2::uuid[]) = $3 THEN 'ADMIN' ELSE 'MEMBER' END`,
      [group[0].sys_id, data.member_ids, data.creator_id]
    );

    return group[0];
  }

  /**
   * @method getChatMessages
   * @description Retrieves chat messages with pagination and filtering
   * @param {Object} client - Database client
   * @param {string} groupId - Chat group's ID
   * @param {Object} options - Query options
   * @param {number} [options.limit=50] - Number of messages to return
   * @param {string} [options.before=null] - Timestamp to filter messages before
   * @returns {Array<Object>} List of messages with user details
   */
  static async getChatMessages(client, groupId, { limit = 50, before = null }) {
    const params = [groupId, limit];
    let timeFilter = '';
    
    if (before) {
      timeFilter = 'AND m.created_at < $3';
      params.push(before);
    }

    const { rows } = await client.query(`
      SELECT 
        m.*,
        u.user_name,
        u.avatar_url,
        json_build_object(
          'reactions', COALESCE(json_object_agg(
            DISTINCT r.emoji, 
            COUNT(*) FILTER (WHERE r.emoji IS NOT NULL)
          ), '{}'),
          'read_by', COUNT(DISTINCT mr.user_id)
        ) as stats
      FROM chat_message m
      JOIN sys_user u ON m.user_id = u.sys_id
      LEFT JOIN message_reaction r ON m.sys_id = r.message_id
      LEFT JOIN message_read mr ON m.sys_id = mr.message_id
      WHERE m.group_id = $1 ${timeFilter}
      GROUP BY m.sys_id, m.content, m.created_at, u.user_name, u.avatar_url
      ORDER BY m.created_at DESC
      LIMIT $2`,
      params
    );

    return rows;
  }

  /**
   * @method logTeamActivity
   * @description Records a team activity event
   * @param {Object} client - Database client
   * @param {string} teamId - Team's ID
   * @param {Object} activityData - Activity details
   * @param {string} activityData.type - Activity type
   * @param {Object} activityData.metadata - Additional activity data
   * @returns {Object} Created activity record
   */
  static async logTeamActivity(client, teamId, activityData) {
    const { rows: [activity] } = await client.query(
      `INSERT INTO team_activity 
      (team_id, type, competitor_id, metadata, importance)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        teamId,
        activityData.type,
        activityData.competitor_id,
        activityData.metadata,
        activityData.importance || 'NORMAL'
      ]
    );

    // Notify team members via Redis
    const { rows: members } = await client.query(
      'SELECT competitor_id FROM team_member WHERE team_id = $1',
      [teamId]
    );

    for (const member of members) {
      await redisClient.publish(
        `competitor:${member.competitor_id}:team_activity`,
        JSON.stringify(activity)
      );
    }

    return activity;
  }

  /**
   * @method getTeamActivityFeed
   * @description Retrieves team activity feed with pagination
   * @param {Object} client - Database client
   * @param {string} teamId - Team's ID
   * @param {Object} options - Pagination options
   * @param {number} [options.limit=50] - Number of activities to return
   * @param {number} [options.offset=0] - Number of activities to skip
   * @returns {Array<Object>} List of team activities
   */
  static async getTeamActivityFeed(client, teamId, { limit = 50, offset = 0 }) {
    const { rows } = await client.query(`
      SELECT 
        ta.*,
        u.user_name,
        u.avatar_url,
        json_build_object(
          'reactions', COUNT(DISTINCT tr.sys_id),
          'comments', COUNT(DISTINCT tc.sys_id)
        ) as engagement
      FROM team_activity ta
      JOIN competitor c ON ta.competitor_id = c.sys_id
      JOIN sys_user u ON c.user_id = u.sys_id
      LEFT JOIN team_activity_reaction tr ON ta.sys_id = tr.activity_id
      LEFT JOIN team_activity_comment tc ON ta.sys_id = tc.activity_id
      WHERE ta.team_id = $1
      GROUP BY ta.sys_id, u.user_name, u.avatar_url
      ORDER BY ta.created_at DESC
      LIMIT $2 OFFSET $3`,
      [teamId, limit, offset]
    );

    return rows;
  }

  /**
   * @method pinMessage
   * @description Pins a message in a chat group
   * @param {Object} client - Database client
   * @param {string} messageId - Message's ID
   * @param {string} userId - User performing the pin action
   * @returns {Object} Updated message details
   * @throws {AppError} If message not found or user lacks permission
   */
  static async pinMessage(client, messageId, userId) {
    const { rows: [message] } = await client.query(
      `UPDATE chat_message 
      SET is_pinned = true, pinned_by = $2, pinned_at = CURRENT_TIMESTAMP
      WHERE sys_id = $1
      RETURNING *`,
      [messageId, userId]
    );

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    return message;
  }

  /**
   * @method muteGroupMember
   * @description Temporarily mutes a member in a chat group
   * @param {Object} client - Database client
   * @param {string} groupId - Chat group's ID
   * @param {string} userId - User to mute
   * @param {number} duration - Mute duration in seconds
   * @returns {Object} Created mute record
   */
  static async muteGroupMember(client, groupId, userId, duration) {
    const { rows: [mute] } = await client.query(
      `INSERT INTO chat_member_mute 
      (group_id, user_id, muted_until)
      VALUES ($1, $2, CURRENT_TIMESTAMP + interval '1 second' * $3)
      RETURNING *`,
      [groupId, userId, duration]
    );

    return mute;
  }

  /**
   * @method archiveChat
   * @description Archives a chat group and its messages
   * @param {Object} client - Database client
   * @param {string} groupId - Chat group's ID
   * @returns {Object} Updated chat group details
   */
  static async archiveChat(client, groupId) {
    const { rows: [group] } = await client.query(
      `UPDATE chat_group 
      SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP
      WHERE sys_id = $1
      RETURNING *`,
      [groupId]
    );

    return group;
  }

  /**
   * @method logMaintenance
   * @description Records a maintenance log entry
   * @param {Object} client - Database client
   * @param {Object} data - Maintenance data
   * @param {string} data.type - Maintenance type
   * @param {string} data.description - Maintenance description
   * @param {string} data.logged_by - User ID of maintainer
   * @returns {Object} Created maintenance log
   */
  static async logMaintenance(client, data) {
    const { rows: [log] } = await client.query(
      `INSERT INTO maintenance.maintenance_log 
      (type, description, affected_tables, performed_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        data.type,
        data.description,
        data.affected_tables,
        data.performed_by
      ]
    );

    return log;
  }

  /**
   * @method getMaintenanceHistory
   * @description Retrieves maintenance history with filtering
   * @param {Object} client - Database client
   * @param {Object} options - Filter options
   * @param {string} options.startDate - Start date for filtering
   * @param {string} options.endDate - End date for filtering
   * @param {string} options.type - Maintenance type filter
   * @returns {Array<Object>} Filtered maintenance logs
   */
  static async getMaintenanceHistory(client, { startDate, endDate, type }) {
    let query = `
      SELECT * FROM maintenance.maintenance_log
      WHERE created_at BETWEEN $1 AND $2
    `;

    const params = [startDate, endDate];

    if (type) {
      query += ` AND type = $3`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC`;

    const { rows } = await client.query(query, params);
    return rows;
  }

  /**
   * @method updateTeamMemberRole
   * @description Updates a team member's role
   * @param {Object} client - Database client
   * @param {string} teamId - Team's ID
   * @param {string} competitorId - Member's competitor ID
   * @param {string} newRole - New role to assign
   * @returns {Object} Updated team member record
   * @throws {AppError} If member not found or invalid role
   */
  static async updateTeamMemberRole(client, teamId, competitorId, newRole) {
    const { rows: [member] } = await client.query(
      `UPDATE team_member 
      SET role = $3
      WHERE team_id = $1 AND competitor_id = $2
      RETURNING *`,
      [teamId, competitorId, newRole]
    );

    if (!member) {
      throw new AppError('Team member not found', 404);
    }

    await this.logTeamActivity(client, teamId, {
      type: 'ROLE_CHANGE',
      competitor_id: competitorId,
      metadata: { new_role: newRole }
    });

    return member;
  }

  /**
   * @method getTeamPermissions
   * @description Retrieves permissions for a team member
   * @param {Object} client - Database client
   * @param {string} teamId - Team's ID
   * @param {string} competitorId - Member's competitor ID
   * @returns {Object} Member's permissions
   */
  static async getTeamPermissions(client, teamId, competitorId) {
    const { rows: [permissions] } = await client.query(`
      SELECT 
        tm.role,
        json_build_object(
          'can_invite', tm.role IN ('LEADER', 'OFFICER'),
          'can_kick', tm.role IN ('LEADER', 'OFFICER'),
          'can_promote', tm.role = 'LEADER',
          'can_modify_settings', tm.role = 'LEADER',
          'can_start_events', tm.role IN ('LEADER', 'OFFICER')
        ) as permissions
      FROM team_member tm
      WHERE tm.team_id = $1 AND tm.competitor_id = $2`,
      [teamId, competitorId]
    );

    return permissions;
  }
}

module.exports = SocialService; 