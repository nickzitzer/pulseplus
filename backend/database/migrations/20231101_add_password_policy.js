/**
 * Migration: Add Password Policy Support
 * 
 * This migration adds the necessary tables and columns to support password policy features:
 * 1. Adds password_history table to track previous passwords
 * 2. Adds password_updated_at column to users table
 * 3. Adds failed_login_attempts and account_locked_until columns to users table
 */

const { pool } = require('../connection');
const { logger } = require('../../utils/logger');

/**
 * @function up
 * @description Apply the migration
 * @returns {Promise<void>}
 */
async function up() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Create password_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_history (
        sys_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(sys_id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID
      )
    `);
    
    // Add index on user_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id)
    `);
    
    // Add password_updated_at column to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE
    `);
    
    // Set current passwords as updated now
    await client.query(`
      UPDATE users SET password_updated_at = NOW()
      WHERE password_updated_at IS NULL
    `);
    
    // Add failed_login_attempts column to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0
    `);
    
    // Add account_locked_until column to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('Migration applied: Add Password Policy Support');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    logger.error('Migration failed: Add Password Policy Support', { error });
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}

/**
 * @function down
 * @description Revert the migration
 * @returns {Promise<void>}
 */
async function down() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Drop password_history table
    await client.query(`
      DROP TABLE IF EXISTS password_history CASCADE
    `);
    
    // Remove columns from users table
    await client.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS password_updated_at,
      DROP COLUMN IF EXISTS failed_login_attempts,
      DROP COLUMN IF EXISTS account_locked_until
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('Migration reverted: Add Password Policy Support');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    logger.error('Migration revert failed: Add Password Policy Support', { error });
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}

module.exports = {
  up,
  down
}; 