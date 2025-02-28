#!/bin/bash

# Change to the project root directory
cd "$(dirname "$0")/../.."

# Synchronize all environment variables
echo "Synchronizing environment variables..."
npm run sync-all-env

# Run Docker Compose with all arguments passed to this script
echo "Running Docker Compose..."
docker-compose -f deployment/docker/compose/docker-compose.yml "$@" 