/**
 * @module Permissions
 * @description Permission constants used throughout the application
 */

const PERMISSIONS = {
  // User permissions
  VIEW_USER: 'view_user',
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  MANAGE_USERS: 'manage_users',
  
  // Admin permissions
  ADMIN: 'admin',
  
  // Game permissions
  CREATE_GAME: 'create_game',
  MANAGE_GAME: 'manage_game',
  
  // Season permissions
  MANAGE_SEASON: 'manage_season',
  PARTICIPATE_SEASON: 'participate_season',
  VIEW_ARCHIVES: 'view_archives',
  
  // Competition permissions
  MANAGE_COMPETITIONS: 'manage_competitions',
  
  // Tier permissions
  MANAGE_TIERS: 'manage_tiers',
  
  // Role permissions
  MANAGE_ROLES: 'manage_roles',
  
  // Reward permissions
  MANAGE_REWARDS: 'manage_rewards',
  
  // Economy permissions
  MANAGE_ECONOMY: 'manage_economy',
  VIEW_ECONOMY_STATS: 'view_economy_stats',
  
  // Team permissions
  MANAGE_TEAM: 'manage_team',
  
  // Analytics permissions
  VIEW_ANALYTICS: 'view_analytics',
  
  // Department permissions
  VIEW_DEPARTMENTS: 'view_departments',
  MANAGE_DEPARTMENTS: 'manage_departments'
};

module.exports = PERMISSIONS; 