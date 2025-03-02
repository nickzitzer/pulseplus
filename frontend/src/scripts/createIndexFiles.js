import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for components
const componentsDir = path.join(path.dirname(__dirname), 'components');

// Get all subdirectories in the components directory
const subdirectories = fs.readdirSync(componentsDir)
  .filter(item => {
    const itemPath = path.join(componentsDir, item);
    return fs.statSync(itemPath).isDirectory() && item !== 'fields'; // Skip fields directory as it already has an index.ts
  });

// Create index.ts files for each subdirectory
subdirectories.forEach(subdirectory => {
  const subdirectoryPath = path.join(componentsDir, subdirectory);
  const files = fs.readdirSync(subdirectoryPath)
    .filter(file => 
      file.endsWith('.tsx') && 
      !file.endsWith('.test.tsx') && 
      !file.endsWith('.spec.tsx')
    );
  
  // Generate export statements for each component
  const exportStatements = files.map(file => {
    const componentName = file.replace('.tsx', '');
    return `export { default as ${componentName} } from './${componentName}';`;
  }).join('\n');
  
  // Write the index.ts file
  const indexPath = path.join(subdirectoryPath, 'index.ts');
  fs.writeFileSync(indexPath, exportStatements);
  
  console.log(`Created index.ts for ${subdirectory}/ with ${files.length} components`);
});

console.log('Index files created successfully!'); 