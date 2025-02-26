/**
 * @module permissions
 * @description Permission checking middleware
 * @requires ../utils/appError
 */

const AppError = require('../utils/appError');

/**
 * @function checkPermission
 * @description Middleware to check if user has required permission
 * @param {string|string[]} requiredPermissions - Permission(s) required for the route
 * @returns {Function} Express middleware function
 */
const checkPermission = (requiredPermissions) => {
  return (req, res, next) => {
    // For development, allow all permissions
    console.log(`[DEV MODE] Permission check bypassed for: ${Array.isArray(requiredPermissions) ? requiredPermissions.join(', ') : requiredPermissions}`);
    return next();
    
    // In production, this would check user permissions from req.user
    // Example implementation:
    /*
    if (!req.user) {
      return next(new AppError('User not authenticated', 401));
    }
    
    const userPermissions = req.user.permissions || [];
    
    // Check if user has at least one of the required permissions
    const permissionsToCheck = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];
    
    const hasPermission = permissionsToCheck.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      return next(new AppError('Insufficient permissions', 403));
    }
    
    return next();
    */
  };
};

module.exports = {
  checkPermission
}; 