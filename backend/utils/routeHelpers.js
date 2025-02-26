/**
 * @module routeHelpers
 * @description Common utilities for route handling and database operations
 * @requires ../database/connection
 * @requires ./appError
 * @requires ./logger
 * @requires multer
 * @requires path
 * @requires fs.promises
 */

const { pool } = require('../database/connection');
const AppError = require('./appError');
const { logger } = require('./logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const auditLog = require('./auditLog');

/**
 * @typedef {Object} AuditDetails
 * @property {string} table - Name of the table being audited
 * @property {string} id - Record identifier
 * @property {Object} [old] - Previous state of the record
 * @property {Object} [new] - New state of the record
 */

/**
 * @typedef {Object} UploadedFile
 * @property {string} filename - Generated filename
 * @property {string} filepath - Full path to the file
 * @property {string} mimetype - File MIME type
 * @property {number} size - File size in bytes
 * @property {string} url - Public URL to access the file
 */

/**
 * @function withTransaction
 * @description Wraps a database operation in a transaction
 * @param {Function} operation - Async function to execute within the transaction
 * @param {Object} operation.client - Database client passed to the operation
 * @returns {Promise<*>} Result of the operation
 * @throws {Error} If the operation fails
 * @example
 * const result = await withTransaction(async (client) => {
 *   const { rows } = await client.query('SELECT * FROM users');
 *   return rows;
 * });
 */
async function withTransaction(operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * @function createAuditLog
 * @description Logs an audit event to the database
 * @param {Object} client - Database client
 * @param {Object} user - User performing the action
 * @param {string} user.sys_id - User's unique identifier
 * @param {string} action - Type of action performed
 * @param {AuditDetails} details - Additional details about the action
 * @returns {Promise<void>}
 * @example
 * await createAuditLog(client, user, 'CREATE_USER', {
 *   table: 'users',
 *   id: newUser.id,
 *   new: newUser
 * });
 */
async function createAuditLog(client, user, action, details) {
  try {
    await client.query(
      `INSERT INTO audit_log 
      (user_id, action, table_name, record_id, old_values, new_values)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.sys_id,
        action,
        details.table,
        details.id,
        details.old || null,
        details.new || null
      ]
    );
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw error to prevent disrupting the main operation
  }
}

/**
 * @function handleImageUpload
 * @description Handles image upload, validation, and processing
 * @param {Object} file - The uploaded file object from multer
 * @param {Buffer} file.buffer - File contents
 * @param {string} file.originalname - Original filename
 * @param {string} file.mimetype - File MIME type
 * @param {number} file.size - File size in bytes
 * @param {string} directory - Target directory for the file
 * @returns {Promise<UploadedFile>} Processed file details
 * @throws {AppError} 400 - If file validation fails
 * @example
 * const fileDetails = await handleImageUpload(req.file, 'avatars');
 */
async function handleImageUpload(file, directory) {
  if (!file) {
    throw new AppError('No file provided', 400);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new AppError('Invalid file type. Only JPEG, PNG and GIF are allowed', 400);
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new AppError('File too large. Maximum size is 5MB', 400);
  }

  const uploadDir = path.join(__dirname, '..', 'uploads', directory);
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `${Date.now()}-${file.originalname}`;
  const filepath = path.join(uploadDir, filename);

  await fs.writeFile(filepath, file.buffer);

  return {
    filename,
    filepath,
    mimetype: file.mimetype,
    size: file.size,
    url: `/uploads/${directory}/${filename}`
  };
}

/**
 * @function validatePermissions
 * @description Validates user permissions for a specific resource
 * @param {Object} client - Database client
 * @param {string} userId - User's unique identifier
 * @param {string} resourceId - Resource's unique identifier
 * @param {string[]} requiredPermissions - Array of required permission types
 * @throws {AppError} 403 - If user lacks required permissions
 * @example
 * await validatePermissions(client, userId, gameId, ['MANAGE_GAME', 'VIEW_GAME']);
 */
async function validatePermissions(client, userId, resourceId, requiredPermissions) {
  const { rows } = await client.query(
    `SELECT permission_type 
    FROM user_permissions 
    WHERE user_id = $1 AND resource_id = $2`,
    [userId, resourceId]
  );

  const userPermissions = rows.map(row => row.permission_type);
  
  const hasPermission = requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );

  if (!hasPermission) {
    throw new AppError('Not authorized to perform this action', 403);
  }
}

/**
 * @function applyCriticalEndpointProtection
 * @description Applies standard protection middleware to critical endpoints
 * @param {Object} router - Express router object
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} path - Route path
 * @param {Function[]} middlewares - Array of middleware functions
 * @param {Function} handler - Route handler function
 * @returns {void} - Adds the route with protection to the router
 * @example
 * // Instead of:
 * router.post('/critical-endpoint', handler);
 * 
 * // Use:
 * applyCriticalEndpointProtection(router, 'post', '/critical-endpoint', [], handler);
 */
function applyCriticalEndpointProtection(router, method, path, middlewares, handler) {
  const { rateLimitPresets } = require('./rateLimits');
  const { verifyToken } = require('../middleware/auth');
  
  // Apply standard rate limiting if not already included
  const hasRateLimiting = middlewares.some(middleware => 
    middleware.name === 'rateLimit' || 
    (middleware.toString && middleware.toString().includes('rateLimit'))
  );
  
  const protectedMiddlewares = [...middlewares];
  
  // Add rate limiting if not present
  if (!hasRateLimiting) {
    protectedMiddlewares.unshift(rateLimitPresets.STANDARD);
  }
  
  // Add authentication if not present
  const hasAuth = middlewares.some(middleware => 
    middleware === verifyToken || 
    (middleware.toString && middleware.toString().includes('verifyToken'))
  );
  
  if (!hasAuth && path !== '/health' && !path.startsWith('/public')) {
    protectedMiddlewares.unshift(verifyToken);
  }
  
  // Add the route with protection
  router[method](path, ...protectedMiddlewares, handler);
}

module.exports = {
  withTransaction,
  createAuditLog,
  handleImageUpload,
  validatePermissions,
  applyCriticalEndpointProtection
}; 