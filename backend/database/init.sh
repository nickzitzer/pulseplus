#!/bin/bash
set -e

# Function to execute SQL with error handling
execute_sql() {
    local db=$1
    local sql=$2
    echo "Executing SQL on database: $db"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-EOSQL
        $sql
EOSQL
}

# Function to wait for database to be ready
wait_for_db() {
    local retries=5
    local wait_time=2
    while [ $retries -gt 0 ]
    do
        if pg_isready -d "$POSTGRES_DB" -U "$POSTGRES_USER"; then
            return 0
        fi
        retries=$((retries-1))
        echo "Waiting for database to be ready... ($retries retries left)"
        sleep $wait_time
    done
    return 1
}

# Wait for database to be ready
wait_for_db

# Check if database has been initialized
if [ ! -f "/docker-entrypoint-initdb.d/.init-db" ]; then
    echo "Starting database initialization..."

    # Create pulseplus database
    echo "Creating database pulseplus..."
    execute_sql "$POSTGRES_DB" "CREATE DATABASE pulseplus;"

    # Execute consolidated schema file
    if [ -f "/docker-entrypoint-initdb.d/02-schema.sql" ]; then
        echo "Executing consolidated schema file..."
        execute_sql "pulseplus" "$(cat /docker-entrypoint-initdb.d/02-schema.sql)"
    else
        echo "Error: Schema file not found!"
        exit 1
    fi

    # Execute data file if it exists
    if [ -f "/docker-entrypoint-initdb.d/03-data.sql" ]; then
        echo "Executing data file..."
        execute_sql "pulseplus" "$(cat /docker-entrypoint-initdb.d/03-data.sql)"
    fi

    # Create initialization marker
    touch "/docker-entrypoint-initdb.d/.init-db"
    echo "Database initialization completed successfully"
else
    echo "Database already initialized, skipping initialization"
fi
