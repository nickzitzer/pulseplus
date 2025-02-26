#!/usr/bin/env node

/**
 * @description Script to encrypt sensitive values in .env file
 * @requires ../backend/utils/configEncryption
 * @requires dotenv
 * @requires fs
 * @requires path
 */

const ConfigEncryption = require('../backend/utils/configEncryption');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Define sensitive keys that should be encrypted
const SENSITIVE_KEYS = [
  'DB_PASSWORD',
  'JWT_SECRET',
  'SESSION_SECRET',
  'SMTP_PASS',
  'REDIS_PASSWORD',
  'AWS_SECRET_ACCESS_KEY'
];

// Initialize the encryption utility
const masterKeyPath = process.env.CONFIG_MASTER_KEY_PATH || path.join(__dirname, '../keys/master.key');
const configEncryption = new ConfigEncryption(masterKeyPath);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Main function to encrypt .env file
 */
async function encryptEnvFile() {
  try {
    // Get the .env file path
    const envPath = path.join(__dirname, '../.env');
    
    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      console.error('Error: .env file not found at', envPath);
      process.exit(1);
    }
    
    // Parse the .env file
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    
    // Create a backup of the original .env file
    const backupPath = `${envPath}.backup-${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    console.log(`Backup created at ${backupPath}`);
    
    // Encrypt sensitive values
    let encryptedCount = 0;
    const encryptedConfig = {};
    
    for (const key in envConfig) {
      const value = envConfig[key];
      
      // Skip empty values
      if (!value) {
        encryptedConfig[key] = value;
        continue;
      }
      
      // Skip already encrypted values
      if (configEncryption.isEncrypted(value)) {
        console.log(`Key ${key} is already encrypted, skipping.`);
        encryptedConfig[key] = value;
        continue;
      }
      
      // Encrypt sensitive values
      if (SENSITIVE_KEYS.includes(key)) {
        encryptedConfig[key] = configEncryption.encrypt(value);
        encryptedCount++;
        console.log(`Encrypted ${key}`);
      } else {
        encryptedConfig[key] = value;
      }
    }
    
    // Add CONFIG_ENCRYPTION_ENABLED flag
    encryptedConfig['CONFIG_ENCRYPTION_ENABLED'] = 'true';
    
    // Write the encrypted values back to .env
    const envContent = Object.entries(encryptedConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(envPath, envContent);
    
    console.log(`\nEncryption complete! ${encryptedCount} values encrypted.`);
    console.log('Make sure to set CONFIG_MASTER_KEY_PATH in your environment or .env file.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error encrypting .env file:', error.message);
    process.exit(1);
  }
}

// Ask for confirmation before proceeding
rl.question('This will encrypt sensitive values in your .env file. Continue? (y/n) ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    encryptEnvFile();
  } else {
    console.log('Operation cancelled.');
    process.exit(0);
  }
}); 