require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const platformSchemaFile = path.join(__dirname, 'happytechplatform-postgresql-schema.sql');
const platformDataFile = path.join(__dirname, 'happytechplatform-pulseplus-data.sql');

const schemaFile = path.join(__dirname, 'pulseplus-postgresql-schema.sql');
const dataFile = path.join(__dirname, 'pulseplus-postgresql-synthetic-data.sql');

async function rebuildDatabase() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const platformSchemaSQL = fs.readFileSync(platformSchemaFile, 'utf8');
    console.log('Executing platform schema...');
    await client.query(platformSchemaSQL);
    console.log('Platform Schema executed successfully');

    const platformDataSQL = fs.readFileSync(platformDataFile, 'utf8');
    console.log('Executing platform data...');
    await client.query(platformDataSQL);
    console.log('Platform data inserted successfully');

    const schemaSQL = fs.readFileSync(schemaFile, 'utf8');
    console.log('Executing schema...');
    await client.query(schemaSQL);
    console.log('Schema executed successfully');

    const dataSQL = fs.readFileSync(dataFile, 'utf8');
    console.log('Inserting synthetic data...');
    await client.query(dataSQL);
    console.log('Synthetic data inserted successfully');

    console.log('Database rebuild completed');
  } catch (err) {
    console.error('Error rebuilding database:', err);
  } finally {
    await client.end();
  }
}

rebuildDatabase();