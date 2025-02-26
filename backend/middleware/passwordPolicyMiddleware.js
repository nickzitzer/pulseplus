/**
 * @module passwordPolicyMiddleware
 * @description Middleware to enforce password policy and handle password expiration
 * @requires ../utils/appError
 * @requires ../utils/passwordPolicy
 */

const AppError = require('../utils/appError');
const { isPasswordExpired, PASSWORD_POLICY } = require('../utils/passwordPolicy');
const { pool } = require('../database/connection');
const { logger } = require('../utils/logger');

/**
 * @function requirePasswordChange
 * @description Middleware to check if a user's password has expired and requires changing
 * @returns {Function} Express middleware function
 */
const requirePasswordChange = () => {
  return async (req, res, next) => {
    try {
      // Skip if no user is authenticated
      if (!req.user || !req.user.id) {
        return next();
      }
      
      // Skip for password change endpoints to avoid infinite loops
      if (
        req.path.includes('/auth/change-password') || 
        req.path.includes('/auth/reset-password')
      ) {
        return next();
      }
      
      // Check if password is expired
      const client = await pool.connect();
      try {
        const isExpired = await isPasswordExpired(req.user.id, client);
        
        // If password is expired, only allow access to password change endpoints
        if (isExpired) {
          logger.info(`Password expired for user: ${req.user.id}`);
          return next(new AppError('Password has expired. Please change your password.', 403, 'PASSWORD_EXPIRED'));
        }
        
        next();
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  };
};

/**
 * @function validatePasswordStrength
 * @description Middleware to validate password strength for password-related endpoints
 * @returns {Function} Express middleware function
 */
const validatePasswordStrength = () => {
  return (req, res, next) => {
    try {
      // Only validate for endpoints that include password fields
      if (req.body && req.body.password) {
        const { validatePasswordStrength } = require('../utils/passwordPolicy');
        const validation = validatePasswordStrength(req.body.password);
        
        if (!validation.isValid) {
          return next(new AppError(validation.message, 400, 'INVALID_PASSWORD'));
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * @function checkAccountLockout
 * @description Middleware to check if an account is locked before authentication
 * @returns {Function} Express middleware function
 */
const checkAccountLockout = () => {
  return async (req, res, next) => {
    try {
      // Only check for login endpoints
      if (!req.path.includes('/auth/login')) {
        return next();
      }
      
      const { username, email } = req.body;
      const usernameOrEmail = username || email;
      
      if (!usernameOrEmail) {
        return next();
      }
      
      const client = await pool.connect();
      try {
        // Check if account is locked
        const { rows } = await client.query(
          'SELECT account_locked_until FROM users WHERE username = $1 OR email = $1',
          [usernameOrEmail]
        );
        
        if (rows.length > 0 && rows[0].account_locked_until) {
          const lockedUntil = new Date(rows[0].account_locked_until);
          
          if (lockedUntil > new Date()) {
            const lockTimeRemaining = Math.ceil((lockedUntil - new Date()) / 60000);
            
            logger.warn(`Attempted login to locked account: ${usernameOrEmail}`);
            
            return next(new AppError(
              `Account is locked due to too many failed attempts. Try again in ${lockTimeRemaining} minutes.`,
              403,
              'ACCOUNT_LOCKED'
            ));
          }
        }
        
        next();
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requirePasswordChange,
  validatePasswordStrength,
  checkAccountLockout
}; 