#!/usr/bin/env node

/**
 * @description Script to view configuration version history
 * @requires ../backend/utils/configVersioning
 */

const ConfigVersioning = require('../backend/utils/configVersioning');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'list';
const param1 = args[1];
const param2 = args[2];

// Initialize the versioning utility
const storageDir = process.env.CONFIG_VERSIONS_DIR || path.join(__dirname, '../config-versions');
const configVersioning = new ConfigVersioning({ storageDir });

/**
 * Display version history
 * @param {number} limit - Maximum number of versions to display
 */
function listVersions(limit = 10) {
  const history = configVersioning.getVersionHistory(limit);
  
  if (history.length === 0) {
    console.log('No configuration versions found.');
    console.log(`Check if versions exist in ${storageDir}`);
    return;
  }
  
  console.log(`Configuration Version History (${history.length} versions):`);
  console.log('---------------------------------------------------');
  
  history.forEach((version, index) => {
    const date = new Date(version.timestamp).toLocaleString();
    console.log(`${index + 1}. Version: ${version.versionId.substring(0, 8)}...`);
    console.log(`   Created: ${date}`);
    console.log(`   Environment: ${version.environment}`);
    console.log(`   Hostname: ${version.hostname}`);
    if (version.source) {
      console.log(`   Source: ${version.source}`);
    }
    if (version.user) {
      console.log(`   User: ${version.user}`);
    }
    console.log('---------------------------------------------------');
  });
}

/**
 * Display a specific version
 * @param {string} versionId - Version ID to display
 */
function showVersion(versionId) {
  if (!versionId) {
    console.error('Error: Version ID is required');
    process.exit(1);
  }
  
  const version = configVersioning.getVersion(versionId);
  
  if (!version) {
    console.error(`Error: Version ${versionId} not found`);
    process.exit(1);
  }
  
  console.log(`Configuration Version: ${version.versionId}`);
  console.log('---------------------------------------------------');
  console.log(`Created: ${new Date(version.timestamp).toLocaleString()}`);
  console.log(`Environment: ${version.environment}`);
  console.log(`Hostname: ${version.hostname}`);
  
  if (version.source) {
    console.log(`Source: ${version.source}`);
  }
  
  if (version.user) {
    console.log(`User: ${version.user}`);
  }
  
  console.log('\nConfiguration:');
  console.log(JSON.stringify(version.config, null, 2));
}

/**
 * Compare two versions
 * @param {string} versionId1 - First version ID
 * @param {string} versionId2 - Second version ID
 */
function compareVersions(versionId1, versionId2) {
  if (!versionId1 || !versionId2) {
    console.error('Error: Two version IDs are required for comparison');
    process.exit(1);
  }
  
  const diff = configVersioning.compareVersions(versionId1, versionId2);
  
  if (!diff) {
    console.error('Error: Failed to compare versions');
    process.exit(1);
  }
  
  console.log('Configuration Version Comparison:');
  console.log('---------------------------------------------------');
  console.log(`Version 1: ${diff.versionInfo.version1.versionId}`);
  console.log(`Created: ${new Date(diff.versionInfo.version1.timestamp).toLocaleString()}`);
  console.log(`Environment: ${diff.versionInfo.version1.environment}`);
  
  console.log('\nVersion 2: ${diff.versionInfo.version2.versionId}');
  console.log(`Created: ${new Date(diff.versionInfo.version2.timestamp).toLocaleString()}`);
  console.log(`Environment: ${diff.versionInfo.version2.environment}`);
  
  console.log('\nChanges:');
  console.log(JSON.stringify(diff.changes, null, 2));
}

/**
 * Display help information
 */
function showHelp() {
  console.log('Configuration Version History Viewer');
  console.log('---------------------------------------------------');
  console.log('Usage:');
  console.log('  node view-config-history.js [command] [params]');
  console.log('\nCommands:');
  console.log('  list [limit]         - List version history (default: 10)');
  console.log('  show <versionId>     - Show a specific version');
  console.log('  compare <v1> <v2>    - Compare two versions');
  console.log('  help                 - Show this help information');
}

// Execute the appropriate command
switch (command) {
  case 'list':
    listVersions(param1 ? parseInt(param1) : 10);
    break;
  case 'show':
    showVersion(param1);
    break;
  case 'compare':
    compareVersions(param1, param2);
    break;
  case 'help':
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
} 