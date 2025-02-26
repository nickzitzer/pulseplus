#!/bin/bash
# PulsePlus Database Initialization Script

# Set environment variables if not already set
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-postgres}

# Display initialization message
echo "==================================================="
echo "PulsePlus Database Initialization"
echo "==================================================="
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"
echo "==================================================="

# Run the initialization script
echo "Starting database initialization..."
node init-with-transactions.js

# Check if initialization was successful
if [ $? -eq 0 ]; then
  echo "==================================================="
  echo "Database initialization completed successfully!"
  echo "==================================================="
else
  echo "==================================================="
  echo "Error: Database initialization failed!"
  echo "==================================================="
  exit 1
fi 