# Component Migration Scripts

This directory contains scripts to help migrate components to a more structured organization based on the ComponentsGuide.md file.

## Scripts Overview

1. **migrateComponentsMain.js**: The main script that runs all other scripts in the correct order.
2. **migrateComponents.js**: Moves components to their appropriate subdirectories.
3. **createIndexFiles.js**: Creates index.ts files for each subdirectory to enable cleaner imports.
4. **updateImportsToUseIndex.js**: Updates imports across the codebase to use the new index.ts files.
5. **moveComponentsGuide.js**: Moves the ComponentsGuide.md file to the docs directory.
6. **checkMigration.js**: Verifies that the migration was successful.

## How to Run

To run the migration process, execute the following command from the project root:

```bash
node frontend/src/scripts/migrateComponentsMain.js
```

## Component Categories

The components are organized into the following categories:

- **core**: Core system components like ErrorBoundary and Layout
- **ui**: UI framework components like PulsePlusImage and PulsePlusTitle
- **gamification**: Gamification components like PulsePlusAchievements and PulsePlusQuest
- **social**: Social components like PulsePlusChat and PulsePlusNotifications
- **competition**: Competition components like PulsePlusLeaderboard and PulsePlusCompetitions
- **admin**: Administrative components like AdminDashboard and SSOLoginButtons
- **analytics**: Analytics components (to be added)
- **economy**: Economy components (to be added)
- **season**: Season system components (to be added)
- **powerup**: Power-up components (to be added)

## Migration Process

The migration process follows these steps:

1. Create the necessary subdirectories in the components folder
2. Move each component to its appropriate subdirectory
3. Update imports across the codebase to reflect the new component locations
4. Create index.ts files for each subdirectory to enable cleaner imports
5. Update imports to use the new index.ts files
6. Move the ComponentsGuide.md file to the docs directory
7. Verify that the migration was successful

## After Migration

After running the migration scripts, you should:

1. Verify that all components are in their correct locations
2. Run your application to ensure everything works correctly
3. Update any documentation or references to component locations
4. Commit the changes to your version control system

## Troubleshooting

If you encounter any issues during the migration process:

1. Check the console output for error messages
2. Run the checkMigration.js script to verify component locations
3. Manually fix any issues that the scripts couldn't handle
4. If necessary, revert to a previous version and try again with modified scripts 