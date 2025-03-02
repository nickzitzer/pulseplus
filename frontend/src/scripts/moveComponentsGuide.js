import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const componentsDir = path.join(path.dirname(__dirname), 'components');
const docsDir = path.join(path.dirname(__dirname), 'docs');
const sourceFile = path.join(componentsDir, 'ComponentsGuide.md');
const targetFile = path.join(docsDir, 'ComponentsGuide.md');

// Create docs directory if it doesn't exist
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
  console.log(`Created docs directory at ${docsDir}`);
}

// Move the file
if (fs.existsSync(sourceFile)) {
  fs.copyFileSync(sourceFile, targetFile);
  fs.unlinkSync(sourceFile);
  console.log(`Moved ComponentsGuide.md to ${targetFile}`);
} else {
  console.log(`ComponentsGuide.md not found at ${sourceFile}`);
}

console.log('ComponentsGuide.md migration completed!'); 