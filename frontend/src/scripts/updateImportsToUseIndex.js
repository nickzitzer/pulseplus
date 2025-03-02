import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the component categories
const componentCategories = {
  core: [
    'ErrorBoundary',
    'Layout',
  ],
  ui: [
    'PulsePlusImage',
    'PulsePlusTitle',
    'PulsePlusTimer',
    'DataModal',
  ],
  gamification: [
    'PulsePlusHomeAvatar',
    'PulsePlusProgressBar',
    'PulsePlusAchievements',
    'PulsePlusQuest',
    'PulsePlusBadges',
    'PulsePlusGoals',
    'PulsePlusKPIs',
    'PulsePlusCompetitorCard',
    'PulsePlusGameDropdown',
  ],
  social: [
    'PulsePlusNotifications',
    'PulsePlusChat',
    'PulsePlusSurvey',
  ],
  competition: [
    'PulsePlusCompetitions',
    'PulsePlusMyLeagueStats',
    'PulsePlusLeagueStandings',
    'PulsePlusLeaderboard',
  ],
  admin: [
    'AdminDashboard',
    'SSOLoginButtons',
  ],
};

// Get all TypeScript and TSX files in the project
const findCommand = 'find frontend/src -type f -name "*.ts" -o -name "*.tsx"';
const files = execSync(findCommand).toString().split('\n').filter(Boolean);

// For each file, update the imports
files.forEach(file => {
  // Skip index.ts files
  if (file.endsWith('index.ts')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // Update imports for each component category
  Object.entries(componentCategories).forEach(([category, components]) => {
    // Check if the file imports multiple components from the same category
    const categoryImports = components.filter(component => 
      content.includes(`import ${component} from '@/components/${category}/${component}'`)
    );
    
    if (categoryImports.length > 1) {
      // Replace multiple imports with a single import using destructuring
      const importStatements = categoryImports.map(component => 
        `import ${component} from '@/components/${category}/${component}'`
      );
      
      const destructuredImport = `import { ${categoryImports.join(', ')} } from '@/components/${category}'`;
      
      // Replace each import statement with an empty string first
      importStatements.forEach(statement => {
        content = content.replace(statement, '');
      });
      
      // Add the destructured import at the beginning of the file
      content = content.replace(/^(import .+;\n)+/, match => match + destructuredImport + ';\n');
      modified = true;
    } else {
      // Update individual imports
      components.forEach(component => {
        const importPattern = new RegExp(`import\\s+${component}\\s+from\\s+['"]@/components/${category}/${component}['"]`, 'g');
        
        if (content.match(importPattern)) {
          content = content.replace(importPattern, `import { ${component} } from '@/components/${category}'`);
          modified = true;
        }
      });
    }
  });
  
  // Save the file if it was modified
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Updated imports in ${file}`);
  }
});

console.log('Import updates completed successfully!'); 