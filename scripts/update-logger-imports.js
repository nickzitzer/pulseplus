/**
 * Script to update logger imports across the codebase
 * 
 * This script finds all files that import the logger module using the old format:
 * const logger = require('../utils/logger');
 * 
 * And updates them to use the new structured format:
 * const { logger } = require('../utils/logger');
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all files that import the logger
const output = execSync('grep -r "const logger = require" backend --include="*.js"').toString();
const files = output.split('\n').filter(Boolean).map(line => {
  const [filePath] = line.split(':');
  return filePath;
});

console.log(`Found ${files.length} files to update`);

// Update each file
let updatedCount = 0;
files.forEach(filePath => {
  try {
    // Skip the logger.js file itself
    if (filePath.endsWith('logger.js')) {
      return;
    }
    
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the import statement
    const updatedContent = content.replace(
      /const logger = require\(['"](.+?)['"]\);/g,
      'const { logger } = require(\'$1\');'
    );
    
    // Write the updated content back to the file
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
      updatedCount++;
      console.log(`Updated ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
});

console.log(`Successfully updated ${updatedCount} files`); 