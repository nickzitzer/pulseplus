const { Pool } = require('pg');
const ConfigFactory = require('../utils/configFactory');
const { logger } = require('../utils/logger');

// Create standardized database configuration
const dbConfig = ConfigFactory.createDatabaseConfig({
  // Additional pool configuration
  maxConnections: 20,
  minConnections: 2,
  idleTimeout: 30000,
  connectionTimeout: 2000
});

// Create connection pool
const pool = new Pool(dbConfig);

// Add connection lifecycle logging
pool.on('connect', (client) => {
  logger.debug(`Database connection acquired (total: ${pool.totalCount})`);
});

pool.on('error', (err, client) => {
  logger.error(`Unexpected database error: ${err.message}`, { error: err });
});

// Add connection validation
pool.on('acquire', (client) => {
  // Validate connection before use
  client.query('SELECT 1')
    .catch(err => {
      logger.error(`Connection validation failed: ${err.message}`);
      client.release(true); // Force release with error
    });
});

// Add connection metrics collection
setInterval(() => {
  const metrics = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
  
  logger.debug('Database connection pool metrics', { metrics });
  
  // Here you could send metrics to a monitoring system
  // e.g., prometheus.gauge('db_connections_total').set(metrics.total);
}, 60000); // Collect metrics every minute

/**
 * @function withTransaction
 * @description Execute a function within a database transaction
 * @param {Function} callback - Function to execute within transaction
 * @param {Object} options - Transaction options
 * @param {string} options.isolationLevel - Transaction isolation level
 * @returns {Promise<*>} Result of the callback function
 */
async function withTransaction(callback, options = {}) {
  const client = await pool.connect();
  
  try {
    // Start transaction with optional isolation level
    if (options.isolationLevel) {
      await client.query(`BEGIN ISOLATION LEVEL ${options.isolationLevel}`);
    } else {
      await client.query('BEGIN');
    }
    
    // Execute callback with transaction client
    const result = await callback(client);
    
    // Commit transaction
    await client.query('COMMIT');
    
    return result;
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}

module.exports = {
  pool,
  withTransaction
};
