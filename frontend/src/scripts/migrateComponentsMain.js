import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the scripts to run in order
const scripts = [
  'migrateComponents.js',
  'createIndexFiles.js',
  'updateImportsToUseIndex.js',
  'moveComponentsGuide.js',
  'checkMigration.js',
];

// Run each script in order
for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`\n=== Running ${script} ===\n`);
  
  try {
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`\n✅ ${script} completed successfully\n`);
  } catch (error) {
    console.error(`\n❌ Error running ${script}:`);
    console.error(error.message);
    process.exit(1);
  }
}

console.log('\n=== Component Migration Process Completed ===\n');
console.log('All components have been organized according to the ComponentsGuide.md structure.');
console.log('The guide has been moved to frontend/src/docs/ComponentsGuide.md.');
console.log('Imports have been updated to use the new directory structure.');
console.log('\nPlease verify the changes and run your application to ensure everything works correctly.'); 