/**
 * @module permissionService
 * @description Permission and role management service for access control
 * @requires ../database/connection
 */

const { pool } = require('../database/connection');

/**
 * @constant {Object} ROLES
 * @description Enumeration of system roles
 * @property {string} ADMIN - Administrator role with full access
 * @property {string} MODERATOR - Moderator role with limited administrative access
 * @property {string} USER - Standard user role
 */
const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user'
};

/**
 * @constant {Object} PERMISSIONS
 * @description Enumeration of system permissions
 * @property {string} CREATE_USER - Permission to create users
 * @property {string} UPDATE_USER - Permission to update users
 * @property {string} DELETE_USER - Permission to delete users
 * @property {string} VIEW_USER - Permission to view user details
 * @property {string} MANAGE_ROLES - Permission to manage user roles
 * @property {string} MANAGE_PERMISSIONS - Permission to manage permissions
 * @property {string} MANAGE_SEASON - Permission to manage seasons
 * @property {string} MANAGE_TIERS - Permission to manage tiers
 * @property {string} MANAGE_REWARDS - Permission to manage rewards
 * @property {string} VIEW_ANALYTICS - Permission to view analytics
 * @property {string} VIEW_ARCHIVES - Permission to view archives
 * @property {string} PARTICIPATE_SEASON - Permission to participate in seasons
 * @property {string} MANAGE_COMPETITIONS - Permission to manage competitions
 */
const PERMISSIONS = {
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  VIEW_USER: 'view_user',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_PERMISSIONS: 'manage_permissions',
  MANAGE_SEASON: 'MANAGE_SEASON',
  MANAGE_TIERS: 'MANAGE_TIERS',
  MANAGE_REWARDS: 'MANAGE_REWARDS',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  VIEW_ARCHIVES: 'VIEW_ARCHIVES',
  PARTICIPATE_SEASON: 'PARTICIPATE_SEASON',
  MANAGE_COMPETITIONS: 'MANAGE_COMPETITIONS'
};

/**
 * @constant {Object} rolePermissions
 * @description Mapping of roles to their assigned permissions
 * @private
 */
const rolePermissions = {
  [ROLES.ADMIN]: [
    ...Object.values(PERMISSIONS)
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.VIEW_USER,
    PERMISSIONS.UPDATE_USER
  ],
  [ROLES.USER]: [
    PERMISSIONS.VIEW_USER
  ]
};

/**
 * @function hasPermission
 * @description Checks if a user role has a specific permission
 * @param {string} userRole - User's role
 * @param {string} requiredPermission - Permission to check
 * @returns {boolean} True if the role has the permission
 */
const hasPermission = (userRole, requiredPermission) => {
  if (!userRole || !requiredPermission) return false;
  return rolePermissions[userRole]?.includes(requiredPermission) || false;
};

/**
 * @function checkPermission
 * @description Express middleware to check if a user has a required permission
 * @param {string} requiredPermission - Permission to check
 * @returns {Function} Express middleware function
 * @throws {Response} 403 - If user lacks required permission
 */
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (hasPermission(userRole, requiredPermission)) {
      next();
    } else {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action'
      });
    }
  };
};

/**
 * @function isAdmin
 * @description Express middleware to check if a user is an administrator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @throws {Response} 403 - If user is not an administrator
 */
const isAdmin = (req, res, next) => {
  if (req.user?.role === ROLES.ADMIN) {
    next();
  } else {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
};

/**
 * @function isModerator
 * @description Express middleware to check if a user is a moderator or administrator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @throws {Response} 403 - If user is not a moderator or administrator
 */
const isModerator = (req, res, next) => {
  if ([ROLES.ADMIN, ROLES.MODERATOR].includes(req.user?.role)) {
    next();
  } else {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Moderator access required'
    });
  }
};

/**
 * @function isResourceOwner
 * @description Express middleware to check if a user owns a resource or is an administrator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @throws {Response} 400 - If resource or user ID is missing
 * @throws {Response} 403 - If user does not own the resource
 * @throws {Response} 404 - If resource is not found
 * @throws {Response} 500 - If database query fails
 */
const isResourceOwner = async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user?.id;
    
    if (!resourceId || !userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Resource ID or user ID is missing'
      });
    }

    const { rows } = await pool.query(
      'SELECT user_id FROM resources WHERE sys_id = $1',
      [resourceId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Resource not found'
      });
    }

    if (rows[0].user_id === userId || req.user?.role === ROLES.ADMIN) {
      next();
    } else {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }
  } catch (error) {
    console.error('Error checking resource ownership:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error checking resource ownership'
    });
  }
};

module.exports = {
  ROLES,
  PERMISSIONS,
  hasPermission,
  checkPermission,
  isAdmin,
  isModerator,
  isResourceOwner
}; 