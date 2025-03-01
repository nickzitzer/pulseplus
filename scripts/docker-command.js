#!/usr/bin/env node

/**
 * Docker command helper script
 * 
 * This script provides a flexible way to run docker-compose commands with additional parameters.
 * Usage: node docker-command.js [command] [options]
 * 
 * Examples:
 *   node docker-command.js up            # Run docker-compose up
 *   node docker-command.js up -d         # Run docker-compose up -d (detached mode)
 *   node docker-command.js build --no-cache  # Run docker-compose build with no-cache
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const DOCKER_COMPOSE_FILE = path.resolve(__dirname, '../deployment/docker/compose/docker-compose.yml');

// Get command and arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';
const commandArgs = args.slice(1);

// Base docker-compose command
const baseCommand = ['docker-compose', '-f', DOCKER_COMPOSE_FILE];

// Handle help command
if (command === 'help') {
  console.log(`
Docker Command Helper

Usage: npm run docker -- [command] [options]

Commands:
  up        Start containers (add -d for detached mode)
  down      Stop containers
  build     Build containers (add --no-cache to rebuild from scratch)
  restart   Restart containers
  exec      Execute command in a container
  logs      View container logs

Examples:
  npm run docker -- up -d
  npm run docker -- build --no-cache
  npm run docker -- exec backend npm run migrate
  npm run docker -- logs -f backend
  `);
  process.exit(0);
}

// Construct the full command
const fullCommand = [...baseCommand, command, ...commandArgs];

// Execute the command
console.log(`Executing: ${fullCommand.join(' ')}`);
const dockerProcess = spawn(fullCommand[0], fullCommand.slice(1), { 
  stdio: 'inherit',
  shell: true
});

// Handle process exit
dockerProcess.on('close', (code) => {
  process.exit(code);
}); 