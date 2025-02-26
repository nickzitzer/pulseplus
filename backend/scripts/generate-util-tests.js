#!/usr/bin/env node

/**
 * Script to generate test files for utility modules
 * 
 * Usage: node scripts/generate-util-tests.js [utilName]
 * 
 * If utilName is provided, it will generate a test file for that specific utility.
 * Otherwise, it will generate test files for all utilities that don't have tests yet.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

const UTILS_DIR = path.join(__dirname, '..', 'utils');
const TESTS_DIR = path.join(__dirname, '..', 'tests', 'utils');

// Ensure the tests/utils directory exists
async function ensureTestsDirectory() {
  try {
    await stat(TESTS_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await mkdir(TESTS_DIR, { recursive: true });
      console.log(`Created directory: ${TESTS_DIR}`);
    } else {
      throw err;
    }
  }
}

// Get all utility modules
async function getUtilModules() {
  const files = await readdir(UTILS_DIR);
  return files
    .filter(file => file.endsWith('.js') && file !== 'index.js')
    .map(file => file.replace('.js', ''));
}

// Get existing test files
async function getExistingTests() {
  try {
    const files = await readdir(TESTS_DIR);
    return files
      .filter(file => file.endsWith('.test.js'))
      .map(file => file.replace('.test.js', ''));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

// Generate a test file template
function generateTestTemplate(utilName) {
  return `const ${utilName} = require('../../utils/${utilName}');

describe('${utilName}', () => {
  // TODO: Add tests for ${utilName}
  
  it('should be properly tested', () => {
    // This is a placeholder test
    // Replace with actual tests for the ${utilName} module
    expect(${utilName}).toBeDefined();
  });
});
`;
}

// Generate test file for a utility module
async function generateTestFile(utilName) {
  const testFilePath = path.join(TESTS_DIR, `${utilName}.test.js`);
  
  try {
    await stat(testFilePath);
    console.log(`Test file already exists for ${utilName}`);
    return false;
  } catch (err) {
    if (err.code === 'ENOENT') {
      const template = generateTestTemplate(utilName);
      await writeFile(testFilePath, template);
      console.log(`Generated test file for ${utilName}`);
      return true;
    }
    throw err;
  }
}

// Main function
async function main() {
  try {
    await ensureTestsDirectory();
    
    const specificUtil = process.argv[2];
    
    if (specificUtil) {
      // Generate test for specific utility
      await generateTestFile(specificUtil);
    } else {
      // Generate tests for all utilities without tests
      const utils = await getUtilModules();
      const existingTests = await getExistingTests();
      
      const missingTests = utils.filter(util => !existingTests.includes(util));
      
      if (missingTests.length === 0) {
        console.log('All utilities have test files.');
        return;
      }
      
      console.log(`Found ${missingTests.length} utilities without tests.`);
      
      let generated = 0;
      for (const util of missingTests) {
        const success = await generateTestFile(util);
        if (success) generated++;
      }
      
      console.log(`Generated ${generated} test files.`);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main(); 