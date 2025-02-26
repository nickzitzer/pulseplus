# Database Backup System

This directory contains database backups created by the automated backup system.

## Backup Schedule

The system automatically creates backups according to the following schedule:

- **Daily Backups**: Every day at 2:00 AM UTC
- **Weekly Backups**: Every Sunday at 3:00 AM UTC
- **Monthly Backups**: On the 1st of each month at 4:00 AM UTC

## Backup Formats

- Daily and weekly backups use PostgreSQL's custom format (`.backup` files)
- Monthly backups use plain SQL format (`.sql` files) for better long-term compatibility

## Backup Retention

The system automatically keeps the 30 most recent backups and deletes older ones to prevent disk space issues.

## Manual Backups

You can create manual backups using the backup utility:

```javascript
const { createBackup } = require('./database/backup');

// Create a backup with default options
createBackup()
  .then(backupPath => console.log(`Backup created: ${backupPath}`))
  .catch(error => console.error(`Backup failed: ${error.message}`));

// Create a backup with custom options
createBackup({
  format: 'plain',  // 'plain', 'custom', 'directory', or 'tar'
  compress: true,
  filename: 'my-custom-backup.sql'
})
  .then(backupPath => console.log(`Backup created: ${backupPath}`))
  .catch(error => console.error(`Backup failed: ${error.message}`));
```

## Restoring from Backup

To restore the database from a backup:

```javascript
const { restoreBackup } = require('./database/backup');

// Restore from a backup file
restoreBackup('/path/to/backup/file.backup', {
  dropDatabase: true,     // Whether to drop the database before restoring
  createDatabase: true    // Whether to create the database if it doesn't exist
})
  .then(() => console.log('Database restored successfully'))
  .catch(error => console.error(`Restore failed: ${error.message}`));
```

## Listing Available Backups

To list all available backups:

```javascript
const { listBackups } = require('./database/backup');

const backups = listBackups();
console.log(backups);
```

## Starting the Backup Scheduler

To start the backup scheduler:

```bash
node scripts/schedule-backups.js
```

For production environments, use a process manager like PM2:

```bash
pm2 start scripts/schedule-backups.js --name "backup-scheduler"
```

## Backup Verification

It's recommended to periodically verify backups by restoring them to a test environment to ensure they are valid and can be successfully restored.

## Disaster Recovery

In case of a disaster:

1. Restore the most recent backup using the `restoreBackup` function
2. If the most recent backup is corrupted, try the previous one
3. For point-in-time recovery, restore the most recent backup and then apply WAL (Write-Ahead Log) files if available

## Offsite Backups

For additional safety, consider copying backups to an offsite location or cloud storage service like AWS S3, Google Cloud Storage, or Azure Blob Storage. 