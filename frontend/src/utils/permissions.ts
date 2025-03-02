/**
 * Role-based access control helpers for PulsePlus
 */

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  GAMEMASTER = 'GAMEMASTER',
}

export enum Permission {
  // Content permissions
  VIEW_CONTENT = 'view_content',
  CREATE_CONTENT = 'create_content',
  EDIT_CONTENT = 'edit_content',
  DELETE_CONTENT = 'delete_content',
  
  // User permissions
  VIEW_PROFILE = 'view_profile',
  EDIT_PROFILE = 'edit_profile',
  
  // Game permissions
  PLAY_GAME = 'play_game',
  ACCESS_PREMIUM_GAMES = 'access_premium_games',
  SAVE_GAME = 'save_game',
  CREATE_GAME = 'create_game',
  EDIT_GAME = 'edit_game',
  
  // Admin permissions
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SETTINGS = 'manage_settings',
  
  // Moderation permissions
  MODERATE_CONTENT = 'moderate_content',
  BAN_USERS = 'ban_users',
  
  // Social permissions
  CREATE_POST = 'create_post',
  COMMENT = 'comment',
  LIKE = 'like',
  
  // Economy permissions
  MANAGE_SHOP = 'manage_shop',
  MANAGE_CURRENCY = 'manage_currency',
  
  // Season permissions
  MANAGE_SEASONS = 'manage_seasons',
}

// Define role hierarchy (higher index = higher privileges)
const ROLE_HIERARCHY: UserRole[] = [
  UserRole.USER,
  UserRole.GAMEMASTER,
  UserRole.ADMIN,
];

// Define permissions for each role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.VIEW_CONTENT,
    Permission.VIEW_PROFILE,
    Permission.EDIT_PROFILE,
    Permission.PLAY_GAME,
    Permission.SAVE_GAME,
    Permission.CREATE_POST,
    Permission.COMMENT,
    Permission.LIKE,
  ],
  
  [UserRole.GAMEMASTER]: [
    Permission.VIEW_CONTENT,
    Permission.CREATE_CONTENT,
    Permission.EDIT_CONTENT,
    Permission.VIEW_PROFILE,
    Permission.EDIT_PROFILE,
    Permission.PLAY_GAME,
    Permission.ACCESS_PREMIUM_GAMES,
    Permission.SAVE_GAME,
    Permission.CREATE_GAME,
    Permission.EDIT_GAME,
    Permission.MODERATE_CONTENT,
    Permission.VIEW_USERS,
    Permission.CREATE_POST,
    Permission.COMMENT,
    Permission.LIKE,
    Permission.MANAGE_SHOP,
  ],
  
  [UserRole.ADMIN]: [
    Permission.VIEW_CONTENT,
    Permission.CREATE_CONTENT,
    Permission.EDIT_CONTENT,
    Permission.DELETE_CONTENT,
    Permission.VIEW_PROFILE,
    Permission.EDIT_PROFILE,
    Permission.PLAY_GAME,
    Permission.ACCESS_PREMIUM_GAMES,
    Permission.SAVE_GAME,
    Permission.CREATE_GAME,
    Permission.EDIT_GAME,
    Permission.MODERATE_CONTENT,
    Permission.VIEW_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_SETTINGS,
    Permission.BAN_USERS,
    Permission.CREATE_POST,
    Permission.COMMENT,
    Permission.LIKE,
    Permission.MANAGE_SHOP,
    Permission.MANAGE_CURRENCY,
    Permission.MANAGE_SEASONS,
  ],
};

/**
 * Check if a role has a specific permission
 * @param role - User role
 * @param permission - Permission to check
 * @returns Whether the role has the permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if a role has all of the specified permissions
 * @param role - User role
 * @param permissions - Permissions to check
 * @returns Whether the role has all permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if a role has any of the specified permissions
 * @param role - User role
 * @param permissions - Permissions to check
 * @returns Whether the role has any of the permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 * @param role - User role
 * @returns Array of permissions
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Check if a role has higher or equal privileges than another role
 * @param role - User role to check
 * @param thanRole - Role to compare against
 * @returns Whether the role has higher or equal privileges
 */
export function hasHigherOrEqualRole(role: UserRole, thanRole: UserRole): boolean {
  const roleIndex = ROLE_HIERARCHY.indexOf(role);
  const compareRoleIndex = ROLE_HIERARCHY.indexOf(thanRole);
  
  return roleIndex >= compareRoleIndex;
}

/**
 * Get all roles with a specific permission
 * @param permission - Permission to check
 * @returns Array of roles with the permission
 */
export function getRolesWithPermission(permission: Permission): UserRole[] {
  return Object.entries(ROLE_PERMISSIONS)
    .filter(([_, permissions]) => permissions.includes(permission))
    .map(([role]) => role as UserRole);
}

/**
 * Check if a user has a specific permission
 * @param user - User object with role and optional custom permissions
 * @param permission - Permission to check
 * @returns Whether the user has the permission
 */
export function userHasPermission(
  user: { role: UserRole; permissions?: Permission[] },
  permission: Permission
): boolean {
  // Check custom permissions first if available
  if (user.permissions?.includes(permission)) {
    return true;
  }
  
  // Fall back to role-based permissions
  return hasPermission(user.role, permission);
}

export default {
  UserRole,
  Permission,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  hasHigherOrEqualRole,
  getRolesWithPermission,
  userHasPermission,
}; 