# PulsePlus Database

This directory contains the database schema and initialization scripts for the PulsePlus application.

## Database Structure

The PulsePlus database uses PostgreSQL and follows a structured approach with the following key components:

- **schema.sql**: The consolidated schema file containing all table definitions, indexes, and constraints
- **pulseplus-optimized-synthetic-data.sql**: Sample data for testing and development
- **init-with-transactions.js**: Node.js script to initialize the database with transaction support
- **init.sh**: Shell script for Docker container initialization
- **init-db.sh**: Shell script for local development environment initialization

## Database Initialization

### Docker Environment

When using Docker, the database is automatically initialized using:
- The `init.sh` script in the `/docker-entrypoint-initdb.d/` directory
- The schema and data files are copied to the container during build
- No manual steps are required

### Local Development Environment

To initialize the database locally, follow these steps:

1. Ensure PostgreSQL is installed and running
2. Set the following environment variables or use the defaults:
   - `DB_HOST`: PostgreSQL host (default: localhost)
   - `DB_PORT`: PostgreSQL port (default: 5432)
   - `DB_USER`: PostgreSQL username (default: postgres)
   - `DB_PASSWORD`: PostgreSQL password (default: postgres)

3. Run the initialization script:
   ```bash
   ./init-db.sh
   ```

This will:
- Create the `pulseplus_db` database if it doesn't exist
- Apply the schema from `schema.sql`
- Load sample data from `pulseplus-optimized-synthetic-data.sql` if available

## Schema Overview

The PulsePlus database schema includes the following main components:

1. **User Management**
   - `sys_user`: User accounts
   - `department`: Organizational departments
   - `sys_user_group`: User groups

2. **Game System**
   - `game`: Game definitions
   - `season`: Game seasons
   - `season_tier`: Season progression tiers
   - `virtual_currency`: In-game currencies
   - `reward_shop`: Shops for redeeming rewards
   - `shop_item`: Items available in shops

3. **Competitor System**
   - `competitor`: Player profiles
   - `season_pass_progress`: Player progress in seasons
   - `currency_balance`: Player currency balances
   - `team`: Player teams
   - `team_member`: Team membership

4. **Achievement System**
   - `achievement`: Achievements that can be earned
   - `badge`: Badges that can be awarded
   - `quest`: Quests for players to complete
   - `quest_objective`: Objectives for quests
   - `powerup`: Special abilities or bonuses

5. **Competition System**
   - `competition`: Competitions between players
   - `leaderboard`: Rankings of players
   - `daily_challenge`: Daily challenges for players

6. **Communication System**
   - `notification`: User notifications
   - `chat_group`: Chat groups
   - `chat_message`: Messages in chat groups
   - `survey`: User surveys

7. **Audit System**
   - `audit_log`: System activity logs

## Database Maintenance

For database maintenance tasks:

- **Backup**: Use the `backup.js` script to create database backups
- **Schema Updates**: Modify the `schema.sql` file and re-run initialization

## Notes

- The database uses UUIDs as primary keys for all tables
- Foreign key constraints ensure data integrity
- Indexes are created for frequently queried fields to improve performance
- The commented-out function `SELECT setval(pg_get_serial_sequence('table_name', 'id'), 1, false)` in the data file is a template for resetting sequence counters if needed

## Overview

The database system includes:

- Connection management with SSL/TLS security
- Connection pooling with metrics
- Transaction management utilities
- Backup and recovery tools

## Files

- `connection.js` - Database connection pool setup with SSL/TLS support
- `backup.js` - Database backup and recovery utilities
- `init.sh` - Docker container database initialization script
- `init-db.sh` - Local development database initialization script
- `init-with-transactions.js` - Transactional database initialization
- `schema.sql` - Consolidated schema with all table definitions, constraints, and indexes

## Security Features

The database connection includes several security features:

- SSL/TLS encryption for data in transit
- Connection validation before use
- Parameterized queries to prevent SQL injection
- Transaction boundaries for data consistency

## Backup System

The backup system provides:

- Automated daily backups
- Point-in-time recovery capabilities
- Backup verification
- Retention policy management

For more information on the backup system, see the [Backup Documentation](../documentation/nextra/pages/systems/database/guides/security-and-connections.mdx).

## Connection Pooling

The connection pool is configured with:

- Optimal pool size based on server resources
- Connection timeout settings
- Idle connection management
- Connection validation

## Monitoring

Database metrics are collected and exposed via Prometheus:

- Total connections
- Active connections
- Idle connections
- Waiting clients
- Query duration

## Best Practices

When working with the database:

1. Always use the transaction utility for operations that modify data
2. Use parameterized queries to prevent SQL injection
3. Validate connections before use
4. Use appropriate indexes for frequently queried fields
5. Implement proper error handling for database operations

## Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Connection timeout | Check network connectivity and database server status |
| SSL/TLS errors | Verify certificate paths and validity |
| Connection pool exhaustion | Review connection usage patterns, increase pool size |
| Slow queries | Analyze query execution plan, add appropriate indexes |
| Transaction deadlocks | Review transaction isolation levels | 