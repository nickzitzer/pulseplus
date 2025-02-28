/**
 * Environment Variables Synchronization Script
 * 
 * This script copies the root .env file to the frontend and backend directories,
 * ensuring that all components of the application have access to the same
 * environment variables. It also filters variables based on which ones are
 * needed by each component.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load the root .env file
const rootEnvPath = path.join(__dirname, '..', '.env');
const rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
const rootEnv = dotenv.parse(rootEnvContent);

// Create frontend .env file
const frontendEnvPath = path.join(__dirname, '..', 'frontend', '.env');
let frontendEnvContent = '';

// Add a header comment
frontendEnvContent += '# This file is auto-generated from the root .env file.\n';
frontendEnvContent += '# Do not edit this file directly. Instead, edit the root .env file.\n';
frontendEnvContent += '# Last synced: ' + new Date().toISOString() + '\n\n';

// Add shared and frontend-specific variables
const frontendLines = rootEnvContent.split('\n');
let inFrontendSection = false;
let inSharedSection = false;
let inBackendSection = false;

for (const line of frontendLines) {
  // Track which section we're in
  if (line.includes('SHARED CONFIGURATION')) {
    inSharedSection = true;
    inFrontendSection = false;
    inBackendSection = false;
    frontendEnvContent += line + '\n';
    continue;
  } else if (line.includes('FRONTEND-SPECIFIC CONFIGURATION')) {
    inSharedSection = false;
    inFrontendSection = true;
    inBackendSection = false;
    frontendEnvContent += line + '\n';
    continue;
  } else if (line.includes('BACKEND-SPECIFIC CONFIGURATION')) {
    inSharedSection = false;
    inFrontendSection = false;
    inBackendSection = true;
    continue;
  }

  // Include shared and frontend-specific variables
  if (inSharedSection || inFrontendSection) {
    frontendEnvContent += line + '\n';
  }
}

// Create backend .env file
const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
let backendEnvContent = '';

// Add a header comment
backendEnvContent += '# This file is auto-generated from the root .env file.\n';
backendEnvContent += '# Do not edit this file directly. Instead, edit the root .env file.\n';
backendEnvContent += '# Last synced: ' + new Date().toISOString() + '\n\n';

// Add shared and backend-specific variables
const backendLines = rootEnvContent.split('\n');
inSharedSection = false;
inFrontendSection = false;
inBackendSection = false;

for (const line of backendLines) {
  // Track which section we're in
  if (line.includes('SHARED CONFIGURATION')) {
    inSharedSection = true;
    inFrontendSection = false;
    inBackendSection = false;
    backendEnvContent += line + '\n';
    continue;
  } else if (line.includes('FRONTEND-SPECIFIC CONFIGURATION')) {
    inSharedSection = false;
    inFrontendSection = true;
    inBackendSection = false;
    continue;
  } else if (line.includes('BACKEND-SPECIFIC CONFIGURATION')) {
    inSharedSection = false;
    inFrontendSection = false;
    inBackendSection = true;
    backendEnvContent += line + '\n';
    continue;
  }

  // Include shared and backend-specific variables
  if (inSharedSection || inBackendSection) {
    backendEnvContent += line + '\n';
  }
}

// Write the files
fs.writeFileSync(frontendEnvPath, frontendEnvContent);
fs.writeFileSync(backendEnvPath, backendEnvContent);

console.log('Environment variables synchronized successfully!');
console.log(`- Root .env -> ${frontendEnvPath}`);
console.log(`- Root .env -> ${backendEnvPath}`); 