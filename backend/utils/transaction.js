/**
 * @module transaction
 * @description Utility for handling database transactions
 * @requires ../database/connection
 */

const { pool } = require('../database/connection');
const { logger } = require('./logger');

/**
 * Execute a function within a database transaction
 * 
 * @async
 * @function withTransaction
 * @param {Function} callback - Function to execute within the transaction
 * @param {Object} options - Transaction options
 * @param {string} options.isolationLevel - Transaction isolation level (READ COMMITTED, REPEATABLE READ, SERIALIZABLE)
 * @param {boolean} options.readOnly - Whether the transaction is read-only
 * @param {boolean} options.deferrable - Whether the transaction is deferrable (only applies to SERIALIZABLE)
 * @returns {Promise<*>} - Result of the callback function
 * @throws {Error} If the transaction fails
 * 
 * @example
 * const result = await withTransaction(async (client) => {
 *   const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
 *   await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
 *   return rows[0];
 * });
 */
async function withTransaction(callback, options = {}) {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Set isolation level if specified
    if (options.isolationLevel) {
      const isolationLevelQuery = `SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`;
      await client.query(isolationLevelQuery);
    }
    
    // Set read-only mode if specified
    if (options.readOnly) {
      await client.query('SET TRANSACTION READ ONLY');
    }
    
    // Set deferrable mode if specified (only applies to SERIALIZABLE)
    if (options.isolationLevel === 'SERIALIZABLE' && options.deferrable) {
      await client.query('SET TRANSACTION DEFERRABLE');
    }
    
    // Execute the callback function
    const result = await callback(client);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return result;
  } catch (error) {
    // Rollback the transaction on error
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error('Error rolling back transaction:', rollbackError);
    }
    
    // Log the original error
    logger.error('Transaction failed:', error);
    
    // Rethrow the original error
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

/**
 * Execute a function within a read-only transaction
 * 
 * @async
 * @function withReadTransaction
 * @param {Function} callback - Function to execute within the transaction
 * @returns {Promise<*>} - Result of the callback function
 * @throws {Error} If the transaction fails
 * 
 * @example
 * const user = await withReadTransaction(async (client) => {
 *   const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
 *   return rows[0];
 * });
 */
async function withReadTransaction(callback) {
  return withTransaction(callback, {
    isolationLevel: 'READ COMMITTED',
    readOnly: true
  });
}

/**
 * Execute a function within a write transaction
 * 
 * @async
 * @function withWriteTransaction
 * @param {Function} callback - Function to execute within the transaction
 * @returns {Promise<*>} - Result of the callback function
 * @throws {Error} If the transaction fails
 * 
 * @example
 * await withWriteTransaction(async (client) => {
 *   await client.query('UPDATE users SET status = $1 WHERE id = $2', ['active', userId]);
 *   await client.query('INSERT INTO user_logs (user_id, action) VALUES ($1, $2)', [userId, 'activated']);
 * });
 */
async function withWriteTransaction(callback) {
  return withTransaction(callback, {
    isolationLevel: 'READ COMMITTED'
  });
}

module.exports = {
  withTransaction,
  withReadTransaction,
  withWriteTransaction
}; 