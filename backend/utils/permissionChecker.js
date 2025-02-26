/**
 * @module permissionChecker
 * @description Utilities for checking and enforcing permissions on routes
 * @requires ./permissionService
 * @requires ./logger
 */

const { PERMISSIONS, hasPermission } = require('./permissionService');
const { logger } = require('./logger');

/**
 * @constant {Object} RESOURCE_PERMISSIONS
 * @description Mapping of resources to their required permissions
 */
const RESOURCE_PERMISSIONS = {
  // User resource permissions
  'users': {
    'GET': [PERMISSIONS.VIEW_USER],
    'POST': [PERMISSIONS.CREATE_USER],
    'PUT': [PERMISSIONS.UPDATE_USER],
    'DELETE': [PERMISSIONS.DELETE_USER]
  },
  
  // Season resource permissions
  'seasons': {
    'GET': [PERMISSIONS.VIEW_ARCHIVES],
    'POST': [PERMISSIONS.MANAGE_SEASON],
    'PUT': [PERMISSIONS.MANAGE_SEASON],
    'DELETE': [PERMISSIONS.MANAGE_SEASON]
  },
  
  // Game resource permissions
  'games': {
    'GET': [PERMISSIONS.PARTICIPATE_SEASON],
    'POST': [PERMISSIONS.MANAGE_COMPETITIONS],
    'PUT': [PERMISSIONS.MANAGE_COMPETITIONS],
    'DELETE': [PERMISSIONS.MANAGE_COMPETITIONS]
  },
  
  // Department resource permissions
  'departments': {
    'GET': [PERMISSIONS.VIEW_USER],
    'POST': [PERMISSIONS.MANAGE_ROLES],
    'PUT': [PERMISSIONS.MANAGE_ROLES],
    'DELETE': [PERMISSIONS.MANAGE_ROLES]
  },
  
  // Economy resource permissions
  'economy': {
    'GET': [PERMISSIONS.VIEW_USER],
    'POST': [PERMISSIONS.PARTICIPATE_SEASON],
    'PUT': [PERMISSIONS.PARTICIPATE_SEASON],
    'DELETE': [PERMISSIONS.PARTICIPATE_SEASON]
  },
  
  // Social resource permissions
  'social': {
    'GET': [PERMISSIONS.VIEW_USER],
    'POST': [PERMISSIONS.PARTICIPATE_SEASON],
    'PUT': [PERMISSIONS.PARTICIPATE_SEASON],
    'DELETE': [PERMISSIONS.PARTICIPATE_SEASON]
  }
};

/**
 * @function getRequiredPermissions
 * @description Get required permissions for a resource and method
 * @param {string} resource - Resource name
 * @param {string} method - HTTP method
 * @returns {string[]} Array of required permissions
 */
const getRequiredPermissions = (resource, method) => {
  if (!RESOURCE_PERMISSIONS[resource]) {
    return [];
  }
  
  return RESOURCE_PERMISSIONS[resource][method.toUpperCase()] || [];
};

/**
 * @function checkResourcePermission
 * @description Express middleware to check resource permissions
 * @param {string} resource - Resource name
 * @returns {Function} Express middleware function
 */
const checkResourcePermission = (resource) => {
  return (req, res, next) => {
    const method = req.method;
    const requiredPermissions = getRequiredPermissions(resource, method);
    
    // If no permissions required, allow access
    if (requiredPermissions.length === 0) {
      return next();
    }
    
    // Check if user has required permissions
    const userRole = req.user?.role;
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(userRole, permission)
    );
    
    if (hasAllPermissions) {
      next();
    } else {
      logger.warn(`Permission denied: ${userRole} tried to ${method} ${resource}`, {
        requiredPermissions,
        userId: req.user?.id
      });
      
      res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to perform this action',
          requiredPermissions
        }
      });
    }
  };
};

/**
 * @function applyResourcePermissions
 * @description Apply resource permissions to a router
 * @param {Object} router - Express router
 * @param {string} resource - Resource name
 * @returns {Function} Express middleware function
 */
const applyResourcePermissions = (router, resource) => {
  return checkResourcePermission(resource);
};

module.exports = {
  RESOURCE_PERMISSIONS,
  getRequiredPermissions,
  checkResourcePermission,
  applyResourcePermissions
}; 