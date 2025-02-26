/**
 * @module schedule-backups
 * @description Script to schedule automatic database backups
 * @requires node-cron
 * @requires ../database/backup
 * @requires ../utils/logger
 */

const cron = require('node-cron');
const { createBackup, listBackups } = require('../database/backup');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Maximum number of backups to keep
const MAX_BACKUPS = 30;

/**
 * Clean up old backups, keeping only the most recent ones
 * 
 * @async
 * @function cleanupOldBackups
 * @returns {Promise<void>}
 */
async function cleanupOldBackups() {
  try {
    const backups = listBackups();
    
    // If we have more backups than the maximum, delete the oldest ones
    if (backups.length > MAX_BACKUPS) {
      const backupsToDelete = backups.slice(MAX_BACKUPS);
      
      for (const backup of backupsToDelete) {
        logger.info(`Deleting old backup: ${backup.filename}`);
        fs.unlinkSync(backup.path);
      }
      
      logger.info(`Deleted ${backupsToDelete.length} old backups`);
    }
  } catch (error) {
    logger.error('Error cleaning up old backups:', error);
  }
}

/**
 * Perform a scheduled backup
 * 
 * @async
 * @function performBackup
 * @returns {Promise<void>}
 */
async function performBackup() {
  try {
    logger.info('Starting scheduled backup...');
    
    // Create a backup with the current date in the filename
    const backupPath = await createBackup({
      format: 'custom',
      compress: true
    });
    
    logger.info(`Scheduled backup completed: ${backupPath}`);
    
    // Clean up old backups
    await cleanupOldBackups();
  } catch (error) {
    logger.error('Scheduled backup failed:', error);
  }
}

// Schedule daily backups at 2:00 AM
const dailyBackupJob = cron.schedule('0 2 * * *', performBackup, {
  scheduled: true,
  timezone: 'UTC'
});

// Schedule weekly full backups on Sunday at 3:00 AM
const weeklyBackupJob = cron.schedule('0 3 * * 0', async () => {
  try {
    logger.info('Starting weekly full backup...');
    
    // Create a full backup with the current date in the filename
    const backupPath = await createBackup({
      format: 'custom',
      compress: true,
      filename: `backup-weekly-${new Date().toISOString().split('T')[0]}.backup`
    });
    
    logger.info(`Weekly backup completed: ${backupPath}`);
  } catch (error) {
    logger.error('Weekly backup failed:', error);
  }
}, {
  scheduled: true,
  timezone: 'UTC'
});

// Schedule monthly backups on the 1st of each month at 4:00 AM
const monthlyBackupJob = cron.schedule('0 4 1 * *', async () => {
  try {
    logger.info('Starting monthly full backup...');
    
    // Create a full backup with the current date in the filename
    const backupPath = await createBackup({
      format: 'plain', // Use plain SQL format for monthly backups for better long-term compatibility
      compress: false,
      filename: `backup-monthly-${new Date().toISOString().split('T')[0]}.sql`
    });
    
    logger.info(`Monthly backup completed: ${backupPath}`);
  } catch (error) {
    logger.error('Monthly backup failed:', error);
  }
}, {
  scheduled: true,
  timezone: 'UTC'
});

logger.info('Backup scheduler started');
logger.info('Daily backups scheduled at 2:00 AM UTC');
logger.info('Weekly backups scheduled on Sunday at 3:00 AM UTC');
logger.info('Monthly backups scheduled on the 1st of each month at 4:00 AM UTC');

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Stopping backup scheduler...');
  dailyBackupJob.stop();
  weeklyBackupJob.stop();
  monthlyBackupJob.stop();
  logger.info('Backup scheduler stopped');
  process.exit(0);
});

// Export the jobs for testing or manual control
module.exports = {
  dailyBackupJob,
  weeklyBackupJob,
  monthlyBackupJob,
  performBackup,
  cleanupOldBackups
}; 