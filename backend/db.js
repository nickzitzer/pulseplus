const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

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
