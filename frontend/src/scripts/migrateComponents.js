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
    'ErrorBoundary.tsx',
    'Layout.tsx',
  ],
  ui: [
    'PulsePlusImage.tsx',
    'PulsePlusTitle.tsx',
    'PulsePlusTimer.tsx',
    'DataModal.tsx', // Similar to PulsePlusModal.tsx in the guide
  ],
  gamification: [
    'PulsePlusHomeAvatar.tsx',
    'PulsePlusProgressBar.tsx',
    'PulsePlusAchievements.tsx',
    'PulsePlusQuest.tsx',
    'PulsePlusBadges.tsx',
    'PulsePlusGoals.tsx',
    'PulsePlusKPIs.tsx',
    'PulsePlusCompetitorCard.tsx',
    'PulsePlusGameDropdown.tsx',
  ],
  social: [
    'PulsePlusNotifications.tsx',
    'PulsePlusChat.tsx',
    'PulsePlusSurvey.tsx',
  ],
  competition: [
    'PulsePlusCompetitions.tsx',
    'PulsePlusMyLeagueStats.tsx',
    'PulsePlusLeagueStandings.tsx',
    'PulsePlusLeaderboard.tsx',
  ],
  admin: [
    'AdminDashboard.tsx',
    'SSOLoginButtons.tsx',
    'AdminDashboard.module.css',
  ],
};

// Base directory for components
const componentsDir = path.join(path.dirname(__dirname), 'components');

// Function to move a component file
function moveComponent(filename, category) {
  const sourcePath = path.join(componentsDir, filename);
  const targetDir = path.join(componentsDir, category);
  const targetPath = path.join(targetDir, filename);
  
  // Check if the source file exists
  if (!fs.existsSync(sourcePath)) {
    console.log(`Source file does not exist: ${sourcePath}`);
    return;
  }
  
  // Check if the target directory exists, create if not
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Move the file
  fs.renameSync(sourcePath, targetPath);
  console.log(`Moved ${filename} to ${category}/`);
}

// Move components to their respective directories
Object.entries(componentCategories).forEach(([category, components]) => {
  components.forEach(component => {
    moveComponent(component, category);
  });
});

// Update imports in all files
function updateImports() {
  // Get all TypeScript and TSX files in the project
  const findCommand = 'find frontend/src -type f -name "*.ts" -o -name "*.tsx"';
  const files = execSync(findCommand).toString().split('\n').filter(Boolean);
  
  // For each file, update the imports
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Update imports for each component category
    Object.entries(componentCategories).forEach(([category, components]) => {
      components.forEach(component => {
        // Skip CSS files for import updates
        if (component.endsWith('.css')) return;
        
        const componentName = component.replace('.tsx', '');
        
        // Pattern to match direct imports from components directory
        const importPattern = new RegExp(`import\\s+(.+)\\s+from\\s+['"]@/components/${componentName}['"]`, 'g');
        const relativeImportPattern = new RegExp(`import\\s+(.+)\\s+from\\s+['"]\\.\\./.+/${componentName}['"]`, 'g');
        
        // Replace with imports from the new subdirectory
        if (content.match(importPattern)) {
          content = content.replace(importPattern, `import $1 from '@/components/${category}/${componentName}'`);
          modified = true;
        }
        
        // Handle relative imports
        if (content.match(relativeImportPattern)) {
          content = content.replace(relativeImportPattern, `import $1 from '@/components/${category}/${componentName}'`);
          modified = true;
        }
      });
    });
    
    // Save the file if it was modified
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Updated imports in ${file}`);
    }
  });
}

// Run the import update function
updateImports();

console.log('Component migration completed successfully!'); 