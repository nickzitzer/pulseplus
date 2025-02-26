/**
 * @module init-with-transactions
 * @description Database initialization script with transaction support
 * @requires pg
 * @requires fs
 * @requires path
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { withTransaction } = require('../utils/transaction');

// Configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: 'postgres', // Connect to default database first
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

// Create a new pool for initial connection
const pool = new Pool(config);

/**
 * Initialize the database with transaction support
 * 
 * @async
 * @function initializeDatabase
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
  console.log('Starting database initialization with transaction support...');
  
  try {
    // Check if database exists
    const dbExistsResult = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      ['pulseplus_db']
    );
    
    // Create database if it doesn't exist
    if (dbExistsResult.rows.length === 0) {
      console.log('Creating database pulseplus_db...');
      await pool.query('CREATE DATABASE pulseplus_db');
    } else {
      console.log('Database pulseplus_db already exists');
    }
    
    // Close the initial connection pool
    await pool.end();
    
    // Create a new connection pool for the pulseplus_db
    const pulseplusPool = new Pool({
      ...config,
      database: 'pulseplus_db'
    });
    
    // Initialize schema and data with transaction support
    await withTransaction(async (client) => {
      // Execute consolidated schema file
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        console.log('Executing consolidated schema file...');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSQL);
        console.log('Schema applied successfully');
      } else {
        console.error('Error: schema.sql file not found!');
        throw new Error('Schema file not found');
      }
      
      // Execute data file if it exists
      const dataPath = path.join(__dirname, 'pulseplus-optimized-synthetic-data.sql');
      if (fs.existsSync(dataPath)) {
        console.log('Executing sample data file...');
        const dataSQL = fs.readFileSync(dataPath, 'utf8');
        await client.query(dataSQL);
        console.log('Sample data loaded successfully');
      }
      
      console.log('Database initialization completed successfully');
    }, { isolationLevel: 'SERIALIZABLE' });
    
    // Close the pulseplus connection pool
    await pulseplusPool.end();
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase }; 