const AppError = require('../utils/appError');
const redisClient = require('../config/redis');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const { createCrudService, withTransaction } = require('../utils/serviceFactory');
const { logger } = require('../utils/logger');
const { clearResourceCache } = require('../utils/cacheConfig');
const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/connection');
const TokenService = require('../utils/tokenService');
const passwordPolicy = require('../utils/passwordPolicy');

/**
 * @module UserService
 * @description Service for user management operations
 * @requires ../utils/serviceFactory
 * @requires ../utils/appError
 * @requires ../utils/logger
 * @requires ../utils/cacheConfig
 * @requires ../utils/cacheService
 * @requires ../database/connection
 * @requires bcryptjs
 * @requires jsonwebtoken
 * @requires crypto
 * @requires ../utils/passwordPolicy
 */

// Create base CRUD service
const baseCrudService = createCrudService('users', {
  idField: 'sys_id',
  searchFields: ['username', 'email', 'first_name', 'last_name'],
  allowedFields: ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'status'],
  hooks: {
    beforeCreate: async (data) => {
      // Validate password strength
      if (data.password) {
        const validation = passwordPolicy.validatePasswordStrength(data.password);
        if (!validation.isValid) {
          throw new AppError(validation.message, 400, 'INVALID_PASSWORD');
        }
        
        // Hash password before creating user
        data.password = await bcrypt.hash(data.password, 10);
        
        // Set password_updated_at to now
        data.password_updated_at = new Date();
      }
    },
    afterCreate: async (user, currentUser, client) => {
      // Clear user cache
      clearResourceCache(cacheManager, CACHE_NAMES.USER, 'USER', 'CREATE');
      
      // Create user profile
      await client.query(
        'INSERT INTO user_profiles (user_id) VALUES ($1)',
        [user.sys_id]
      );
      
      // Add initial password to history
      if (user.password) {
        await passwordPolicy.addToPasswordHistory(user.sys_id, user.password, client);
      }
      
      // Log user creation
      logger.info(`User created: ${user.username}`, {
        userId: user.sys_id,
        createdBy: currentUser?.id
      });
    },
    beforeUpdate: async (id, data) => {
      // Validate and hash password if updating password
      if (data.password) {
        const validation = passwordPolicy.validatePasswordStrength(data.password);
        if (!validation.isValid) {
          throw new AppError(validation.message, 400, 'INVALID_PASSWORD');
        }
        
        data.password = await bcrypt.hash(data.password, 10);
        
        // Set password_updated_at to now
        data.password_updated_at = new Date();
      }
    },
    afterUpdate: async (user, oldData, currentUser, client) => {
      // Clear user cache
      clearResourceCache(cacheManager, CACHE_NAMES.USER, 'USER', 'UPDATE', user.sys_id);
      
      // Add updated password to history if password was changed
      if (user.password && user.password !== oldData.password) {
        await passwordPolicy.addToPasswordHistory(user.sys_id, user.password, client);
      }
      
      // Log user update
      logger.info(`User updated: ${user.username}`, {
        userId: user.sys_id,
        updatedBy: currentUser?.id
      });
    },
    afterDelete: async (user, currentUser) => {
      // Clear user cache
      clearResourceCache(cacheManager, CACHE_NAMES.USER, 'USER', 'DELETE', user.sys_id);
      
      // Log user deletion
      logger.info(`User deleted: ${user.username}`, {
        userId: user.sys_id,
        deletedBy: currentUser?.id
      });
    }
  }
});

/**
 * @function authenticate
 * @description Authenticate a user with username/email and password
 * @param {string} usernameOrEmail - Username or email
 * @param {string} password - User password
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Authentication result with token
 * @throws {AppError} If authentication fails
 */
const authenticate = async (usernameOrEmail, password, client = null) => {
  let dbClient = client;
  let shouldReleaseClient = false;
  
  try {
    // If no client is provided, get one from the pool
    if (!dbClient) {
      dbClient = await pool.connect();
      shouldReleaseClient = true;
    }
    
    // Find user by username or email
    const result = await dbClient.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [usernameOrEmail]
    );
    
    const user = result.rows[0];
    
    // Check if user exists
    if (!user) {
      throw new AppError('Invalid username/email or password', 401);
    }
    
    // Check if user is active
    if (!user.is_active) {
      throw new AppError('Account is disabled', 403);
    }
    
    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      const lockTimeRemaining = Math.ceil((new Date(user.account_locked_until) - new Date()) / 60000);
      throw new AppError(`Account is locked. Try again in ${lockTimeRemaining} minutes`, 403, 'ACCOUNT_LOCKED');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      
      // Check if account should be locked
      if (failedAttempts >= passwordPolicy.PASSWORD_POLICY.MAX_FAILED_ATTEMPTS) {
        // Lock account
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + passwordPolicy.PASSWORD_POLICY.LOCKOUT_DURATION_MINUTES);
        
        await dbClient.query(
          'UPDATE users SET failed_login_attempts = $1, account_locked_until = $2 WHERE sys_id = $3',
          [failedAttempts, lockUntil, user.sys_id]
        );
        
        logger.warn(`Account locked due to too many failed login attempts: ${user.username}`, {
          userId: user.sys_id,
          failedAttempts,
          lockedUntil: lockUntil
        });
        
        throw new AppError(`Too many failed login attempts. Account locked for ${passwordPolicy.PASSWORD_POLICY.LOCKOUT_DURATION_MINUTES} minutes`, 403, 'ACCOUNT_LOCKED');
      } else {
        // Update failed login attempts
        await dbClient.query(
          'UPDATE users SET failed_login_attempts = $1 WHERE sys_id = $2',
          [failedAttempts, user.sys_id]
        );
        
        logger.warn(`Failed login attempt: ${user.username}`, {
          userId: user.sys_id,
          failedAttempts
        });
      }
      
      throw new AppError('Invalid username/email or password', 401);
    }
    
    // Reset failed login attempts on successful login
    await dbClient.query(
      'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE sys_id = $1',
      [user.sys_id]
    );
    
    // Check if password is expired
    const isPasswordExpired = await passwordPolicy.isPasswordExpired(user.sys_id, dbClient);
    
    // Get user permissions
    const permissions = await getUserPermissions(user.sys_id, dbClient);
    
    // Create user object with permissions
    const userWithPermissions = {
      sys_id: user.sys_id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions,
      passwordExpired: isPasswordExpired
    };
    
    // Generate tokens using TokenService
    const { accessToken, refreshToken } = await TokenService.generateTokens(userWithPermissions);
    
    // Update last login timestamp
    await dbClient.query(
      'UPDATE users SET last_login = NOW() WHERE sys_id = $1',
      [user.sys_id]
    );
    
    // Return user data and tokens
    return {
      user: {
        id: user.sys_id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        permissions,
        passwordExpired: isPasswordExpired
      },
      accessToken,
      refreshToken
    };
  } catch (error) {
    throw error;
  } finally {
    // Release client back to pool if we acquired it
    if (shouldReleaseClient && dbClient) {
      dbClient.release();
    }
  }
};

/**
 * @function getUserPermissions
 * @description Get permissions for a user
 * @param {string} userId - User ID
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<string[]>} Array of permission codes
 * @private
 */
const getUserPermissions = async (userId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Get user role
    const { rows: userRows } = await dbClient.query(
      'SELECT role FROM users WHERE sys_id = $1',
      [userId]
    );
    
    if (userRows.length === 0) {
      return [];
    }
    
    const userRole = userRows[0].role;
    
    // Get permissions for role
    const { rows: permissionRows } = await dbClient.query(
      'SELECT permission_code FROM role_permissions WHERE role_name = $1',
      [userRole]
    );
    
    return permissionRows.map(row => row.permission_code);
  }, client);
};

/**
 * @function resetPassword
 * @description Reset a user's password
 * @param {string} email - User email
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<boolean>} True if reset email was sent
 * @throws {AppError} If user not found
 */
const resetPassword = async (email, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Find user by email
    const { rows } = await dbClient.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    
    const user = rows[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    
    // Store reset token in database
    await dbClient.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE sys_id = $2',
      [resetTokenHash, user.sys_id]
    );
    
    // TODO: Send reset email with token
    
    return true;
  }, client);
};

/**
 * @function changePassword
 * @description Change a user's password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<boolean>} True if password was changed
 * @throws {AppError} If current password is invalid
 */
const changePassword = async (userId, currentPassword, newPassword, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Find user
    const { rows } = await dbClient.query(
      'SELECT * FROM users WHERE sys_id = $1',
      [userId]
    );
    
    if (rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    
    const user = rows[0];
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      throw new AppError('Current password is invalid', 401, 'INVALID_PASSWORD');
    }
    
    // Validate new password strength
    const validation = passwordPolicy.validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      throw new AppError(validation.message, 400, 'INVALID_PASSWORD');
    }
    
    // Check if new password is in history
    const isNotInHistory = await passwordPolicy.checkPasswordHistory(userId, newPassword, dbClient);
    if (!isNotInHistory) {
      throw new AppError('Password has been used recently. Please choose a different password.', 400, 'PASSWORD_REUSE');
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await dbClient.query(
      'UPDATE users SET password = $1, password_updated_at = NOW(), updated_at = NOW() WHERE sys_id = $2',
      [hashedPassword, userId]
    );
    
    // Add to password history
    await passwordPolicy.addToPasswordHistory(userId, hashedPassword, dbClient);
    
    return true;
  }, client);
};

/**
 * @function forcePasswordReset
 * @description Force a user to reset their password on next login
 * @param {string} userId - User ID
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<boolean>} True if password reset was forced
 */
const forcePasswordReset = async (userId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Set password_updated_at to null to force reset
    await dbClient.query(
      'UPDATE users SET password_updated_at = NULL WHERE sys_id = $1',
      [userId]
    );
    
    logger.info(`Forced password reset for user: ${userId}`);
    
    return true;
  }, client);
};

/**
 * @function unlockAccount
 * @description Unlock a user account that has been locked due to failed login attempts
 * @param {string} userId - User ID
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<boolean>} True if account was unlocked
 */
const unlockAccount = async (userId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    await dbClient.query(
      'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE sys_id = $1',
      [userId]
    );
    
    logger.info(`Account unlocked for user: ${userId}`);
    
    return true;
  }, client);
};

// Export service with all methods
const UserService = {
  // Base CRUD operations
  ...baseCrudService,
  
  // Custom methods
  authenticate,
  getUserPermissions,
  resetPassword,
  changePassword,
  forcePasswordReset,
  unlockAccount
};

module.exports = UserService; 