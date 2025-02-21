const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  allowExitOnIdle: true
});

// Add connection lifecycle logging
pool.on('connect', (client) => {
  console.log(`Acquired connection (total: ${pool.totalCount})`);
});

pool.on('remove', (client) => {
  console.log(`Released connection (total: ${pool.totalCount})`);
});

// Add health check endpoint
pool.healthCheck = async () => {
  try {
    const { rows } = await pool.query('SELECT 1');
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

function parseFilterQuery(query) {
  const filters = [];
  for (const [key, value] of Object.entries(query)) {
    if (key.includes('STARTSWITH')) {
      const [field] = key.split('STARTSWITH');
      filters.push(`${field} LIKE '${value}%'`);
    } else if (key.includes('ENDSWITH')) {
      const [field] = key.split('ENDSWITH');
      filters.push(`${field} LIKE '%${value}'`);
    } else if (key.includes('CONTAINS')) {
      const [field] = key.split('CONTAINS');
      filters.push(`${field} LIKE '%${value}%'`);
    } else {
      filters.push(`${key} = '${value}'`);
    }
  }
  return filters.join(' AND ');
}

module.exports = { pool, parseFilterQuery };
