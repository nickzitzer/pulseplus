/**
 * @module backup
 * @description Database backup and restore utilities
 * @requires child_process
 * @requires fs
 * @requires path
 * @requires ../config
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const config = require('../config');
const { logger } = require('../utils/logger');

// Promisify exec
const execPromise = util.promisify(exec);

// Backup directory
const BACKUP_DIR = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a database backup
 * 
 * @async
 * @function createBackup
 * @param {Object} options - Backup options
 * @param {string} options.format - Backup format (plain, custom, directory, tar)
 * @param {boolean} options.compress - Whether to compress the backup
 * @param {string} options.filename - Custom filename (default: auto-generated)
 * @returns {Promise<string>} Path to the backup file
 * @throws {Error} If the backup fails
 */
async function createBackup(options = {}) {
  try {
    const format = options.format || 'custom';
    const compress = options.compress !== false;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = options.filename || `backup-${timestamp}.${format === 'plain' ? 'sql' : 'backup'}`;
    const backupPath = path.join(BACKUP_DIR, filename);
    
    // Build pg_dump command
    let command = `PGPASSWORD=${config.db.password} pg_dump`;
    command += ` -h ${config.db.host}`;
    command += ` -p ${config.db.port}`;
    command += ` -U ${config.db.user}`;
    command += ` -d ${config.db.database}`;
    command += ` -F ${format.charAt(0)}`; // Format: p (plain), c (custom), d (directory), t (tar)
    
    if (compress && format !== 'plain') {
      command += ' -Z 9'; // Compression level (0-9)
    }
    
    command += ` -f ${backupPath}`;
    
    // Execute pg_dump
    logger.info(`Creating database backup: ${filename}`);
    await execPromise(command);
    
    logger.info(`Backup created successfully: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error('Backup failed:', error);
    throw new Error(`Backup failed: ${error.message}`);
  }
}

/**
 * Restore a database from backup
 * 
 * @async
 * @function restoreBackup
 * @param {string} backupPath - Path to the backup file
 * @param {Object} options - Restore options
 * @param {boolean} options.dropDatabase - Whether to drop the database before restoring
 * @param {boolean} options.createDatabase - Whether to create the database if it doesn't exist
 * @returns {Promise<void>}
 * @throws {Error} If the restore fails
 */
async function restoreBackup(backupPath, options = {}) {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    const dropDatabase = options.dropDatabase === true;
    const createDatabase = options.createDatabase !== false;
    
    // Determine backup format
    const format = path.extname(backupPath) === '.sql' ? 'plain' : 'custom';
    
    // Drop database if requested
    if (dropDatabase) {
      logger.info(`Dropping database: ${config.db.database}`);
      
      // Connect to postgres database to drop the target database
      const dropCommand = `PGPASSWORD=${config.db.password} psql`;
      dropCommand += ` -h ${config.db.host}`;
      dropCommand += ` -p ${config.db.port}`;
      dropCommand += ` -U ${config.db.user}`;
      dropCommand += ` -d postgres`;
      dropCommand += ` -c "DROP DATABASE IF EXISTS ${config.db.database}"`;
      
      await execPromise(dropCommand);
    }
    
    // Create database if requested
    if (createDatabase) {
      logger.info(`Creating database if not exists: ${config.db.database}`);
      
      // Connect to postgres database to create the target database
      const createCommand = `PGPASSWORD=${config.db.password} psql`;
      createCommand += ` -h ${config.db.host}`;
      createCommand += ` -p ${config.db.port}`;
      createCommand += ` -U ${config.db.user}`;
      createCommand += ` -d postgres`;
      createCommand += ` -c "CREATE DATABASE ${config.db.database} WITH OWNER = ${config.db.user} ENCODING = 'UTF8'"`;
      
      await execPromise(createCommand);
    }
    
    // Build restore command
    let restoreCommand;
    
    if (format === 'plain') {
      // For plain SQL files, use psql
      restoreCommand = `PGPASSWORD=${config.db.password} psql`;
      restoreCommand += ` -h ${config.db.host}`;
      restoreCommand += ` -p ${config.db.port}`;
      restoreCommand += ` -U ${config.db.user}`;
      restoreCommand += ` -d ${config.db.database}`;
      restoreCommand += ` -f ${backupPath}`;
    } else {
      // For custom, directory, or tar formats, use pg_restore
      restoreCommand = `PGPASSWORD=${config.db.password} pg_restore`;
      restoreCommand += ` -h ${config.db.host}`;
      restoreCommand += ` -p ${config.db.port}`;
      restoreCommand += ` -U ${config.db.user}`;
      restoreCommand += ` -d ${config.db.database}`;
      restoreCommand += ' --no-owner --no-privileges';
      restoreCommand += ` -1`; // Process everything in a single transaction
      restoreCommand += ` ${backupPath}`;
    }
    
    // Execute restore command
    logger.info(`Restoring database from backup: ${backupPath}`);
    await execPromise(restoreCommand);
    
    logger.info('Database restored successfully');
  } catch (error) {
    logger.error('Restore failed:', error);
    throw new Error(`Restore failed: ${error.message}`);
  }
}

/**
 * List available backups
 * 
 * @function listBackups
 * @returns {Array<Object>} List of backup files with metadata
 */
function listBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    
    return files
      .filter(file => file.startsWith('backup-') && (file.endsWith('.sql') || file.endsWith('.backup')))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime,
          format: file.endsWith('.sql') ? 'plain' : 'custom'
        };
      })
      .sort((a, b) => b.created - a.created); // Sort by date, newest first
  } catch (error) {
    logger.error('Error listing backups:', error);
    return [];
  }
}

/**
 * Schedule automatic backups
 * 
 * @function scheduleBackups
 * @param {string} schedule - Cron schedule expression
 * @param {Object} options - Backup options
 * @returns {Object} Scheduled job
 */
function scheduleBackups(schedule, options = {}) {
  try {
    // This is a placeholder for actual scheduling logic
    // In a real implementation, you would use a library like node-cron
    logger.info(`Scheduled backups with schedule: ${schedule}`);
    
    // Return a mock job object
    return {
      schedule,
      options,
      stop: () => logger.info('Stopped scheduled backups')
    };
  } catch (error) {
    logger.error('Error scheduling backups:', error);
    throw new Error(`Error scheduling backups: ${error.message}`);
  }
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  scheduleBackups,
  BACKUP_DIR
}; 