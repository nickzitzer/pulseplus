import fs from 'fs';
import path from 'path';
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
    'DataModal.tsx',
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

// Check if components are in their correct directories
function checkComponentLocations() {
  let allCorrect = true;
  
  Object.entries(componentCategories).forEach(([category, components]) => {
    components.forEach(component => {
      const expectedPath = path.join(componentsDir, category, component);
      const oldPath = path.join(componentsDir, component);
      
      if (fs.existsSync(expectedPath)) {
        console.log(`✅ ${component} is correctly located in ${category}/`);
      } else if (fs.existsSync(oldPath)) {
        console.log(`❌ ${component} is still in the root components directory`);
        allCorrect = false;
      } else {
        console.log(`❓ ${component} not found in either location`);
        allCorrect = false;
      }
    });
  });
  
  return allCorrect;
}

// Check for any remaining components in the root directory
function checkRemainingComponents() {
  const allCategorizedComponents = Object.values(componentCategories).flat();
  const rootFiles = fs.readdirSync(componentsDir)
    .filter(file => 
      fs.statSync(path.join(componentsDir, file)).isFile() && 
      file !== 'ComponentsGuide.md'
    );
  
  if (rootFiles.length > 0) {
    console.log('\nRemaining files in root components directory:');
    rootFiles.forEach(file => {
      console.log(`- ${file}`);
    });
    return false;
  }
  
  return true;
}

// Run the checks
const locationsCorrect = checkComponentLocations();
const noRemainingComponents = checkRemainingComponents();

if (locationsCorrect && noRemainingComponents) {
  console.log('\n✅ Migration completed successfully!');
} else {
  console.log('\n❌ Migration incomplete. Please check the issues above.');
} 