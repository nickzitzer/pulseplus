/**
 * @module auditLog
 * @description Audit logging functionality for tracking system changes
 * @requires ../database/connection
 */

const { pool } = require('../database/connection');

/**
 * @typedef {Object} User
 * @property {string} sys_id - User's unique identifier
 */

/**
 * @typedef {Object} AuditDetails
 * @property {string} table - Name of the table being audited
 * @property {string} id - Record identifier
 * @property {Object} [old] - Previous state of the record
 * @property {Object} [new] - New state of the record
 */

/**
 * @function auditLog
 * @description Logs an audit event to the database
 * @param {Object} client - Database client
 * @param {User} user - User performing the action
 * @param {string} action - Type of action performed
 * @param {AuditDetails} details - Additional details about the action
 * @returns {Promise<void>}
 * @throws {Error} If logging fails
 * 
 * @example
 * // Log a user creation event
 * await auditLog(client, user, 'CREATE_USER', {
 *   table: 'users',
 *   id: newUser.id,
 *   new: newUser
 * });
 * 
 * // Log a record update
 * await auditLog(client, user, 'UPDATE_PROFILE', {
 *   table: 'user_profiles',
 *   id: userId,
 *   old: oldProfile,
 *   new: newProfile
 * });
 * 
 * // Log a deletion
 * await auditLog(client, user, 'DELETE_MESSAGE', {
 *   table: 'messages',
 *   id: messageId,
 *   old: message
 * });
 */
async function auditLog(client, user, action, details) {
  try {
    await client.query(
      `INSERT INTO audit_log 
      (user_id, action, table_name, record_id, old_values, new_values, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
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
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent disrupting the main operation
  }
}

module.exports = {
  auditLog
}; 