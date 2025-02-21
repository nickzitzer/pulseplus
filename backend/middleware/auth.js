/**
 * @module auth
 * @description Authentication middleware for JWT token validation and user authorization
 * @requires jsonwebtoken
 * @requires ../utils/appError
 */

const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');

/**
 * @typedef {Object} DecodedToken
 * @property {string} id - User's unique identifier
 * @property {string[]} permissions - Array of user permissions
 * @property {string} role - User's role
 * @property {number} iat - Token issued at timestamp
 * @property {number} exp - Token expiration timestamp
 */

/**
 * @function verifyToken
 * @description Express middleware to verify JWT tokens in request headers
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {Promise<void>}
 * @throws {AppError} 401 - If token is missing or invalid
 * @modifies {req} Adds decoded token data to req.user
 * 
 * @example
 * // Use as middleware in route
 * router.get('/protected',
 *   verifyToken,
 *   (req, res) => {
 *     // req.user is now available with decoded token data
 *     res.json({ user: req.user });
 *   }
 * );
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      throw new AppError('Invalid token', 401);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @function checkPermissions
 * @description Express middleware to verify user permissions
 * @param {string[]} requiredPermissions - Array of required permission strings
 * @returns {import('express').RequestHandler} Express middleware function
 * @throws {AppError} 403 - If user lacks required permissions
 * @requires verifyToken - Must be used after verifyToken middleware
 * 
 * @example
 * // Use as middleware in route
 * router.post('/admin/users',
 *   verifyToken,
 *   checkPermissions(['MANAGE_USERS']),
 *   adminController.createUser
 * );
 * 
 * // Multiple permissions
 * router.put('/admin/settings',
 *   verifyToken,
 *   checkPermissions(['MANAGE_SETTINGS', 'VIEW_ADMIN_PANEL']),
 *   settingsController.update
 * );
 */
const checkPermissions = (requiredPermissions) => {
  /**
   * @function permissionMiddleware
   * @private
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next function
   * @returns {void}
   */
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.permissions) {
        throw new AppError('User permissions not found', 403);
      }

      const hasPermission = requiredPermissions.every(
        permission => req.user.permissions.includes(permission)
      );

      if (!hasPermission) {
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  verifyToken,
  checkPermissions
}; 