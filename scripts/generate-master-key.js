#!/usr/bin/env node

/**
 * @description Script to generate a master encryption key for configuration
 * @requires ../backend/utils/configEncryption
 */

const ConfigEncryption = require('../backend/utils/configEncryption');
const path = require('path');
const fs = require('fs');

// Create keys directory if it doesn't exist
const keysDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Generate and save the master key
const keyPath = path.join(keysDir, 'master.key');
const keyHex = ConfigEncryption.generateMasterKey(keyPath);

console.log('Master encryption key generated successfully!');
console.log('Key (hex):', keyHex);
console.log('Key saved to:', keyPath);
console.log('\nIMPORTANT: Keep this key secure and do not commit it to version control.');
console.log('Add the keys directory to your .gitignore file if it\'s not already there.');

// Add instructions for setting up in different environments
console.log('\nFor development:');
console.log('  - Keep the key file in the keys directory');
console.log('  - Set CONFIG_MASTER_KEY_PATH=./keys/master.key in your .env file');

console.log('\nFor production:');
console.log('  - Store the key in AWS Secrets Manager or similar service');
console.log('  - Set CONFIG_MASTER_KEY as an environment variable with the hex value');
console.log('  - Set CONFIG_MASTER_KEY_PATH=ENV:CONFIG_MASTER_KEY in your environment'); 