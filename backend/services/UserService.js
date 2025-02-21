const AppError = require('../utils/appError');
const redisClient = require('../config/redis');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');

/**
 * @class UserService
 * @description Service class handling user management, authentication, profiles,
 * notifications, and SSO integration
 */
class UserService {
  /**
   * @method login
   * @description Authenticates a user with email and password
   * @param {Object} client - Database client
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Object} Authenticated user details
   * @throws {AppError} If credentials are invalid
   */
  static async login(client, email, password) {
    const { rows } = await client.query(
      `SELECT * FROM sys_user 
      WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
      [email, password]
    );

    if (rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    return rows[0];
  }

  /**
   * @method register
   * @description Registers a new user in the system
   * @param {Object} client - Database client
   * @param {Object} userData - User registration data
   * @param {string} userData.user_name - Chosen username
   * @param {string} userData.first_name - User's first name
   * @param {string} userData.last_name - User's last name
   * @param {string} userData.email - User's email address
   * @param {string} userData.password - User's password
   * @returns {Object} Created user details
   */
  static async register(client, userData) {
    const { rows } = await client.query(
      `INSERT INTO sys_user 
      (user_name, first_name, last_name, email, password_hash)
      VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf')))
      RETURNING *`,
      [
        userData.user_name,
        userData.first_name,
        userData.last_name,
        userData.email,
        userData.password
      ]
    );

    return rows[0];
  }

  /**
   * @method refreshToken
   * @description Refreshes an authentication token
   * @todo Implement token refresh logic
   */
  static async refreshToken() {}
  
  /**
   * @method getUserProfile
   * @description Retrieves a user's profile with statistics
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @returns {Object} User profile with achievement statistics
   * @throws {AppError} If user is not found
   */
  static async getUserProfile(client, userId) {
    const { rows } = await client.query(`
      SELECT 
        u.*,
        json_build_object(
          'achievements', COUNT(DISTINCT ca.achievement_id),
          'badges', COUNT(DISTINCT cb.badge_id),
          'quests_completed', COUNT(DISTINCT CASE WHEN qp.status = 'COMPLETED' THEN qp.quest_id END)
        ) as stats
      FROM sys_user u
      LEFT JOIN competitor c ON u.sys_id = c.user_id
      LEFT JOIN competitor_achievement ca ON c.sys_id = ca.competitor_id
      LEFT JOIN competitor_badge cb ON c.sys_id = cb.competitor_id
      LEFT JOIN quest_progression qp ON c.sys_id = qp.competitor_id
      WHERE u.sys_id = $1
      GROUP BY u.sys_id`,
      [userId]
    );

    if (rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    return rows[0];
  }

  /**
   * @method updateUserProfile
   * @description Updates a user's profile information
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {Object} data - Profile update data
   * @param {string} [data.user_name] - New username
   * @param {string} [data.first_name] - New first name
   * @param {string} [data.last_name] - New last name
   * @param {string} [data.avatar_url] - New avatar URL
   * @param {string} [data.about_me] - New about me text
   * @returns {Object} Updated user profile
   * @throws {AppError} If user is not found
   */
  static async updateUserProfile(client, userId, data) {
    const { rows } = await client.query(
      `UPDATE sys_user 
      SET 
        user_name = COALESCE($1, user_name),
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        avatar_url = COALESCE($4, avatar_url),
        about_me = COALESCE($5, about_me),
        sys_updated_at = CURRENT_TIMESTAMP
      WHERE sys_id = $6
      RETURNING *`,
      [
        data.user_name,
        data.first_name,
        data.last_name,
        data.avatar_url,
        data.about_me,
        userId
      ]
    );

    if (rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    return rows[0];
  }

  /**
   * @method getUserSettings
   * @description Retrieves a user's preference settings
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @returns {Object} User settings including notifications, privacy, and game preferences
   */
  static async getUserSettings(client, userId) {
    const { rows } = await client.query(
      `SELECT 
        notification_preferences,
        privacy_settings,
        game_preferences
      FROM user_settings
      WHERE user_id = $1`,
      [userId]
    );

    return rows[0] || {};
  }

  /**
   * @method updateUserSettings
   * @description Updates a user's preference settings
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {Object} settings - Settings to update
   * @param {Object} settings.notification_preferences - Notification settings
   * @param {Object} settings.privacy_settings - Privacy settings
   * @param {Object} settings.game_preferences - Game-related preferences
   * @returns {Object} Updated settings
   */
  static async updateUserSettings(client, userId, settings) {
    const { rows } = await client.query(
      `INSERT INTO user_settings 
      (user_id, notification_preferences, privacy_settings, game_preferences)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        notification_preferences = EXCLUDED.notification_preferences,
        privacy_settings = EXCLUDED.privacy_settings,
        game_preferences = EXCLUDED.game_preferences
      RETURNING *`,
      [
        userId,
        settings.notification_preferences,
        settings.privacy_settings,
        settings.game_preferences
      ]
    );

    return rows[0];
  }

  /**
   * @method checkPermissions
   * @description Checks if a user has required permissions for a resource
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {string} resourceType - Type of resource to check
   * @param {string} resourceId - Resource's unique identifier
   * @param {string[]} actions - Required actions to check
   * @throws {AppError} If user lacks required permissions
   */
  static async checkPermissions(client, userId, resourceType, resourceId, actions) {
    const { rowCount } = await client.query(
      `SELECT * FROM permissions 
      WHERE user_id = $1 
      AND resource_type = $2 
      AND resource_id = $3 
      AND action = ANY($4)`,
      [userId, resourceType, resourceId, actions]
    );

    if (rowCount === 0) {
      throw new AppError('Forbidden', 403, 'PERMISSION_DENIED');
    }
  }
  
  /**
   * @method createNotification
   * @description Creates a new notification for a user
   * @param {Object} client - Database client
   * @param {Object} data - Notification data
   * @param {string} data.recipient_id - Recipient's user ID
   * @param {string} data.type - Notification type
   * @param {string} data.title - Notification title
   * @param {string} data.message - Notification message
   * @param {Object} [data.data] - Additional notification data
   * @param {string} [data.priority='NORMAL'] - Notification priority
   * @param {string} [data.game_id] - Related game ID
   * @param {string} [data.source_type] - Source type
   * @param {string} [data.source_id] - Source identifier
   * @returns {Object} Created notification
   */
  static async createNotification(client, data) {
    const { rows } = await client.query(
      `INSERT INTO notification 
      (recipient_id, type, title, message, data, priority, 
       game_id, source_type, source_id, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
      RETURNING *`,
      [
        data.recipient_id,
        data.type,
        data.title,
        data.message,
        data.data || {},
        data.priority || 'NORMAL',
        data.game_id,
        data.source_type,
        data.source_id
      ]
    );

    // Push to Redis for real-time notifications
    await redisClient.publish(
      `notifications:${data.recipient_id}`,
      JSON.stringify(rows[0])
    );

    return rows[0];
  }

  /**
   * @method getNotifications
   * @description Retrieves notifications for a user
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {Object} options - Query options
   * @param {number} [options.limit=50] - Maximum notifications to return
   * @param {number} [options.offset=0] - Number of notifications to skip
   * @param {boolean} [options.unreadOnly=false] - Only return unread notifications
   * @returns {Array<Object>} List of notifications
   */
  static async getNotifications(client, userId, { limit = 50, offset = 0, unreadOnly = false }) {
    let query = `
      SELECT 
        n.*,
        g.name as game_name,
        CASE 
          WHEN n.source_type = 'ACHIEVEMENT' THEN a.name
          WHEN n.source_type = 'QUEST' THEN q.name
          WHEN n.source_type = 'TRADE' THEN t.sys_id
          ELSE NULL
        END as source_name
      FROM notification n
      LEFT JOIN game g ON n.game_id = g.sys_id
      LEFT JOIN achievement a ON n.source_id = a.sys_id AND n.source_type = 'ACHIEVEMENT'
      LEFT JOIN quest q ON n.source_id = q.sys_id AND n.source_type = 'QUEST'
      LEFT JOIN trade_offer t ON n.source_id = t.sys_id AND n.source_type = 'TRADE'
      WHERE n.recipient_id = $1
    `;

    if (unreadOnly) {
      query += ' AND n.is_read = false';
    }

    query += `
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await client.query(query, [userId, limit, offset]);
    return rows;
  }

  /**
   * @method loginWithSSO
   * @description Authenticates a user using SSO provider
   * @param {Object} client - Database client
   * @param {string} provider - SSO provider name
   * @param {string} token - SSO authentication token
   * @returns {Object} Authenticated user details
   * @throws {AppError} If SSO provider is not supported
   */
  static async loginWithSSO(client, provider, token) {
    const { rows: [ssoProvider] } = await client.query(
      'SELECT * FROM sso_provider WHERE name = $1 AND active = true',
      [provider]
    );

    if (!ssoProvider) {
      throw new AppError('SSO provider not supported', 400);
    }

    // Verify token with SSO provider
    const ssoUser = await this.verifySSOToken(ssoProvider, token);

    // Find or create user
    const { rows: [user] } = await client.query(
      `INSERT INTO sys_user 
      (email, user_name, first_name, last_name, sso_provider, sso_id, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (email) DO UPDATE
      SET last_login = CURRENT_TIMESTAMP
      RETURNING *`,
      [ssoUser.email, ssoUser.username, ssoUser.firstName, ssoUser.lastName, provider, ssoUser.id]
    );

    return user;
  }

  /**
   * @method linkSSOAccount
   * @description Links an SSO account to an existing user
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {string} provider - SSO provider name
   * @param {string} token - SSO account token
   * @returns {Object} Updated user details
   * @throws {AppError} If user is not found
   */
  static async linkSSOAccount(client, userId, provider, token) {
    const { rows: [user] } = await client.query(
      `UPDATE sys_user 
      SET sso_provider = $1, sso_id = $2
      WHERE sys_id = $3
      RETURNING *`,
      [provider, token, userId]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  /**
   * @method getDepartments
   * @description Retrieves all available departments
   * @param {Object} client - Database client
   * @returns {Array<Object>} List of departments
   */
  static async getDepartments(client) {
    const { rows } = await client.query(`
      SELECT 
        d.*,
        COUNT(u.sys_id) as user_count,
        json_agg(json_build_object(
          'id', u.sys_id,
          'name', u.user_name
        )) FILTER (WHERE u.sys_id IS NOT NULL) as users
      FROM department d
      LEFT JOIN sys_user u ON d.sys_id = u.department_id
      GROUP BY d.sys_id
    `);

    return rows;
  }

  /**
   * @method assignUserToDepartment
   * @description Assigns a user to a department
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {string} departmentId - Department's unique identifier
   * @returns {Object} Assignment details
   */
  static async assignUserToDepartment(client, userId, departmentId) {
    const { rows: [user] } = await client.query(
      `UPDATE sys_user 
      SET department_id = $1
      WHERE sys_id = $2
      RETURNING *`,
      [departmentId, userId]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  /**
   * @method updateAvatarCustomization
   * @description Updates a user's avatar customization
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {Object} customizationData - Avatar customization data
   * @returns {Object} Updated avatar details
   */
  static async updateAvatarCustomization(client, userId, customizationData) {
    const { rows: [customization] } = await client.query(
      `INSERT INTO avatar_customization 
      (user_id, components, colors, accessories)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        components = EXCLUDED.components,
        colors = EXCLUDED.colors,
        accessories = EXCLUDED.accessories
      RETURNING *`,
      [userId, customizationData.components, customizationData.colors, customizationData.accessories]
    );

    return customization;
  }

  /**
   * @method getAvailableCustomizations
   * @description Retrieves available avatar customization options
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @returns {Object} Available customization options
   */
  static async getAvailableCustomizations(client, userId) {
    const { rows } = await client.query(`
      SELECT 
        ac.*,
        oc.unlock_date,
        oc.source
      FROM avatar_customization ac
      LEFT JOIN owned_customization oc ON ac.sys_id = oc.customization_id 
        AND oc.user_id = $1
      WHERE ac.is_active = true
      ORDER BY ac.rarity, ac.name`,
      [userId]
    );

    return rows;
  }

  /**
   * @method verifyEmail
   * @description Verifies a user's email address
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {string} token - Verification token
   * @returns {Object} Verification result
   * @throws {AppError} If token is invalid or expired
   */
  static async verifyEmail(client, userId, token) {
    const { rows: [verification] } = await client.query(
      `SELECT * FROM email_verification 
      WHERE user_id = $1 AND token = $2 AND expires_at > CURRENT_TIMESTAMP`,
      [userId, token]
    );

    if (!verification) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    await client.query(
      `UPDATE sys_user 
      SET email_verified = true 
      WHERE sys_id = $1`,
      [userId]
    );

    await client.query(
      'DELETE FROM email_verification WHERE user_id = $1',
      [userId]
    );

    return true;
  }

  /**
   * @method requestPasswordReset
   * @description Initiates a password reset request
   * @param {Object} client - Database client
   * @param {string} email - User's email address
   * @returns {boolean} True if request was successful
   * @throws {AppError} If user is not found
   */
  static async requestPasswordReset(client, email) {
    const { rows: [user] } = await client.query(
      'SELECT * FROM sys_user WHERE email = $1',
      [email]
    );

    if (!user) {
      // Return true even if user not found to prevent email enumeration
      return true;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await client.query(
      `INSERT INTO password_reset 
      (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at`,
      [user.sys_id, token, expires]
    );

    // Send reset email
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: {
        token,
        username: user.user_name
      }
    });

    return true;
  }

  /**
   * @method resetPassword
   * @description Resets a user's password using a reset token
   * @param {Object} client - Database client
   * @param {string} token - Password reset token
   * @param {string} newPassword - New password
   * @returns {Object} Password reset result
   * @throws {AppError} If token is invalid or expired
   */
  static async resetPassword(client, token, newPassword) {
    const { rows: [reset] } = await client.query(
      `SELECT * FROM password_reset 
      WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (!reset) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    await client.query(
      `UPDATE sys_user 
      SET password_hash = crypt($1, gen_salt('bf'))
      WHERE sys_id = $2`,
      [newPassword, reset.user_id]
    );

    await client.query(
      'DELETE FROM password_reset WHERE user_id = $1',
      [reset.user_id]
    );

    return true;
  }

  /**
   * @method createSession
   * @description Creates a new user session
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @param {Object} deviceInfo - Device information
   * @returns {Object} Created session details
   */
  static async createSession(client, userId, deviceInfo) {
    const { rows: [session] } = await client.query(
      `INSERT INTO user_session 
      (user_id, device_info, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '30 days')
      RETURNING *`,
      [userId, deviceInfo]
    );

    return session;
  }

  /**
   * @method invalidateSession
   * @description Invalidates a user session
   * @param {Object} client - Database client
   * @param {string} sessionId - Session's unique identifier
   * @returns {boolean} True if session was invalidated
   */
  static async invalidateSession(client, sessionId) {
    await client.query(
      'UPDATE user_session SET active = false WHERE sys_id = $1',
      [sessionId]
    );
  }

  /**
   * @method getUserSessions
   * @description Retrieves all active sessions for a user
   * @param {Object} client - Database client
   * @param {string} userId - User's unique identifier
   * @returns {Array<Object>} List of active sessions
   */
  static async getUserSessions(client, userId) {
    const { rows } = await client.query(
      `SELECT * FROM user_session 
      WHERE user_id = $1 AND active = true
      ORDER BY created_at DESC`,
      [userId]
    );

    return rows;
  }
}

module.exports = UserService; 