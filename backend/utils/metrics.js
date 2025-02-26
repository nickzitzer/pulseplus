/**
 * @module metrics
 * @description Prometheus metrics collection for application monitoring
 * @requires prom-client
 */

const promClient = require('prom-client');
const { pool } = require('../database/connection');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics (memory, CPU, etc.)
promClient.collectDefaultMetrics({ register });

// Database connection pool metrics
const dbConnectionPoolSize = new promClient.Gauge({
  name: 'db_connection_pool_size',
  help: 'Total size of the database connection pool',
  registers: [register]
});

const dbConnectionPoolActive = new promClient.Gauge({
  name: 'db_connection_pool_active',
  help: 'Number of active connections in the pool',
  registers: [register]
});

const dbConnectionPoolIdle = new promClient.Gauge({
  name: 'db_connection_pool_idle',
  help: 'Number of idle connections in the pool',
  registers: [register]
});

const dbConnectionPoolWaiting = new promClient.Gauge({
  name: 'db_connection_pool_waiting',
  help: 'Number of clients waiting for a connection',
  registers: [register]
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

// Update connection pool metrics every 5 seconds
setInterval(async () => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM pg_stat_activity');
      
      // Update metrics
      dbConnectionPoolSize.set(pool.totalCount || 0);
      dbConnectionPoolActive.set(pool.totalCount - pool.idleCount || 0);
      dbConnectionPoolIdle.set(pool.idleCount || 0);
      dbConnectionPoolWaiting.set(pool.waitingCount || 0);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating connection pool metrics:', error);
  }
}, 5000);

// Middleware to track query duration
const trackQueryDuration = (query, params, callback) => {
  const end = dbQueryDuration.startTimer();
  
  const wrappedCallback = (err, res) => {
    end();
    callback(err, res);
  };
  
  return { query, params, callback: wrappedCallback };
};

// Patch the pool's query method to track duration
const originalQuery = pool.query.bind(pool);
pool.query = (...args) => {
  const [query, params, callback] = args;
  
  if (typeof callback === 'function') {
    const tracked = trackQueryDuration(query, params, callback);
    return originalQuery(tracked.query, tracked.params, tracked.callback);
  } else if (typeof params === 'function') {
    const tracked = trackQueryDuration(query, undefined, params);
    return originalQuery(tracked.query, tracked.callback);
  } else {
    const end = dbQueryDuration.startTimer();
    const result = originalQuery(...args);
    
    if (result && typeof result.then === 'function') {
      return result.then((res) => {
        end();
        return res;
      }).catch((err) => {
        end();
        throw err;
      });
    }
    
    return result;
  }
};

// Export the Prometheus client classes along with our metrics
module.exports = {
  register,
  // Export Prometheus client classes
  Counter: promClient.Counter,
  Gauge: promClient.Gauge,
  Histogram: promClient.Histogram,
  Summary: promClient.Summary,
  // Export our metrics
  metrics: {
    dbConnectionPoolSize,
    dbConnectionPoolActive,
    dbConnectionPoolIdle,
    dbConnectionPoolWaiting,
    dbQueryDuration
  }
}; 