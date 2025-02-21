/**
 * @module UserRoutes
 * @description User management and authentication routes
 * @requires express
 * @requires ../utils/validation
 * @requires ../utils/routeHelpers
 * @requires ../middleware/auth
 * @requires ../services/UserService
 */
const express = require('express');
const router = express.Router();
const { validateRequest, withTransaction } = require('../utils/validation');
const { auditLog } = require('../utils/routeHelpers');
const { verifyToken } = require('../middleware/auth');
const { AppError } = require('../utils/appError');
const UserService = require('../services/UserService');
const { userValidationSchemas, schemas: { commonSchemas } } = require('../utils/schemas');
const crudFactory = require('../utils/crudFactory');
const { checkPermission, PERMISSIONS } = require('../utils/permissionService');
const { processImageUpload, deleteFile } = require('../utils/fileUtils');
const path = require('path');
const fileService = require('../utils/fileStorage');
const rateLimit = require('express-rate-limit');
const { responseHandler } = require('../utils/responseHandler');
const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');
const { rateLimitPresets } = require('../utils/rateLimits');
const { uploadService } = require('../utils/fileUpload');
const { createCacheMiddleware } = require('../middleware/cacheMiddleware');
const { CACHE_PATTERNS, CACHE_CLEAR_PATTERNS } = require('../utils/cacheConfig');

/**
 * @constant {Object} authLimiter
 * @description Rate limiter for authentication routes with strict settings
 */
const authLimiter = rateLimitPresets.STRICT;

/**
 * @constant {Object} passwordResetLimiter
 * @description Rate limiter for password reset operations with bulk settings
 */
const passwordResetLimiter = rateLimitPresets.BULK;

module.exports = crudFactory({
  resourceName: 'user',
  schema: userValidationSchemas.user,
  middleware: [verifyToken],
  validations: {
    create: {
      body: userValidationSchemas.register,
      permissions: [PERMISSIONS.MANAGE_USERS]
    },
    update: {
      body: userValidationSchemas.userUpdate,
      permissions: [PERMISSIONS.MANAGE_USERS]
    },
    delete: {
      permissions: [PERMISSIONS.MANAGE_USERS]
    },
    settings: {
      body: userValidationSchemas.userSettings
    }
  },
  customEndpoints: (router) => {
    // Enhanced Profile Endpoint with caching
    router.get('/profile',
      verifyToken,
      createCacheMiddleware(
        'PROFILE',
        (req) => CACHE_PATTERNS.PROFILE(req.user.sys_id)
      ),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            return await UserService.getUserProfile(client, req.user.sys_id);
          });

          responseHandler.sendSuccess(res, result);
        } catch (error) {
          next(error);
        }
      }
    );

    // Settings Management
    router.put('/settings',
      verifyToken,
      validateRequest({
        body: userValidationSchemas.userSettings
      }),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const settings = await UserService.updateUserSettings(
              client,
              req.user.sys_id,
              req.body
            );

            // Clear cache using standardized patterns
            CACHE_CLEAR_PATTERNS.PROFILE_UPDATE(req.user.sys_id).forEach(key => 
              cacheManager.clear(CACHE_NAMES.USER, key)
            );

            await auditLog(client, req.user, 'UPDATE_SETTINGS', {
              table: 'user_settings',
              id: settings.sys_id,
              old: req.body,
              new: settings
            });

            return settings;
          });

          responseHandler.sendSuccess(res, result);
        } catch (error) {
          next(error);
        }
      }
    );

    // Avatar Customization
    router.put('/avatar',
      verifyToken,
      uploadService.handle('avatar'),
      validateRequest(userValidationSchemas.userAvatar),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const avatarUrl = await uploadService.processAndSave(
              req.file, 
              'avatar',
              'user-avatars'
            );
            const avatar = await UserService.updateAvatarCustomization(
              client,
              req.user.sys_id,
              { avatar_url: avatarUrl }
            );

            // Clear cache using standardized patterns
            CACHE_CLEAR_PATTERNS.PROFILE_UPDATE(req.user.sys_id).forEach(key => 
              cacheManager.clear(CACHE_NAMES.USER, key)
            );

            await auditLog(client, req.user, 'UPDATE_AVATAR', {
              table: 'avatar_customization',
              id: avatar.sys_id,
              old: { avatar_url: null },
              new: avatar
            });

            return avatar;
          });

          responseHandler.sendUpdated(res, result);
        } catch (error) {
          next(error);
        }
      }
    );

    // User Preferences
    router.get('/preferences',
      verifyToken,
      createCacheMiddleware(
        'PREFERENCES',
        (req) => CACHE_PATTERNS.PROFILE(req.user.sys_id)
      ),
      async (req, res, next) => {
        try {
          const preferences = await withTransaction(async (client) => {
            return await UserService.getUserPreferences(client, req.user.sys_id);
          });
          responseHandler.sendSuccess(res, preferences);
        } catch (error) {
          next(error);
        }
      }
    );

    router.put('/preferences',
      verifyToken,
      validateRequest({ body: userValidationSchemas.userPreferences }),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const prefs = await UserService.updateUserPreferences(client, req.user.sys_id, req.body);
            
            // Clear cache using standardized patterns
            CACHE_CLEAR_PATTERNS.PROFILE_UPDATE(req.user.sys_id).forEach(key => 
              cacheManager.clear(CACHE_NAMES.USER, key)
            );

            await auditLog(client, req.user, 'UPDATE_PREFERENCES', {
              table: 'user_preferences',
              id: prefs.sys_id,
              old: req.body,
              new: prefs
            });
            return prefs;
          });
          responseHandler.sendUpdated(res, result);
        } catch (error) {
          next(error);
        }
      }
    );

    // Enhanced Session Management
    router.get('/sessions',
      verifyToken,
      validateRequest({
        query: commonSchemas.pagination
      }),
      createCacheMiddleware(
        'SESSIONS',
        (req) => CACHE_PATTERNS.SESSIONS(req.user.sys_id)
      ),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            return await UserService.getUserSessions(
              client, 
              req.user.sys_id,
              {
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0
              }
            );
          });
          responseHandler.sendSuccess(res, result);
        } catch (error) {
          next(error);
        }
      }
    );

    return router;
  }
});

/**
 * @route GET /:userId/customization
 * @description Retrieve user profile customization settings
 * @middleware validateRequest - Validates user ID parameter
 * @middleware createCacheMiddleware - Handles response caching
 * @param {string} req.params.userId - User's unique identifier
 * @returns {Object} User's profile customization settings
 * @throws {AppError} 404 - User not found
 */
router.get('/:userId/customization', 
  validateRequest({
    params: commonSchemas.uuid
  }),
  createCacheMiddleware(
    'PROFILE',
    (req) => CACHE_PATTERNS.PROFILE(req.params.userId)
  ),
  async (req, res, next) => {
    try {
      const customization = await UserService.getProfileCustomization(req.client, req.params.userId);
      responseHandler.sendUpdated(res, customization);
    } catch (err) {
      next(err);
    }
  }
);

router.put('/:userId/customization',
  validateRequest({
    params: commonSchemas.uuid,
    body: userValidationSchemas.profileCustomization
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const updated = await UserService.updateProfileCustomization(client, req.params.userId, req.body);
        
        await auditLog(client, req.user, 'UPDATE_PROFILE_CUSTOMIZATION', {
          table: 'user_profile',
          id: req.params.userId,
          old: updated,
          new: req.body
        });

        return updated;
      });
      
      responseHandler.sendUpdated(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /auth/login
 * @description Authenticate user and create a new session
 * @middleware rateLimitPresets.AUTH.LOGIN - Rate limiting for login attempts
 * @middleware validateRequest - Validates login credentials
 * @param {Object} req.body.email - User's email address
 * @param {Object} req.body.password - User's password
 * @param {Object} req.body.device_info - Information about the device being used
 * @returns {Object} User and session information
 * @throws {AppError} 401 - Invalid credentials
 * @throws {AppError} 429 - Too many login attempts
 */
router.post('/auth/login',
  rateLimitPresets.AUTH.LOGIN,
  validateRequest({
    body: userValidationSchemas.login
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const user = await UserService.login(client, req.body.email, req.body.password);
        const session = await UserService.createSession(client, user.sys_id, req.body.device_info);

        await auditLog(client, user, 'LOGIN', {
          table: 'user_session',
          id: session.sys_id,
          new: session
        });

        return { user, session };
      });

      responseHandler.sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /auth/register
 * @description Register a new user account
 * @middleware rateLimitPresets.AUTH.REGISTER - Rate limiting for registration attempts
 * @middleware validateRequest - Validates registration data
 * @param {Object} req.body - User registration data
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {Object} req.body.profile - User's profile information
 * @returns {Object} Created user details
 * @throws {AppError} 400 - Invalid registration data
 * @throws {AppError} 409 - Email already exists
 * @audit REGISTER - Logs user registration in audit trail
 */
router.post('/auth/register',
  rateLimitPresets.AUTH.REGISTER,
  validateRequest({
    body: userValidationSchemas.register
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const user = await UserService.register(client, req.body);

        await auditLog(client, user, 'REGISTER', {
          table: 'sys_user',
          id: user.sys_id,
          new: user
        });

        return user;
      });

      responseHandler.sendCreated(res, result, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /auth/refresh
 * @description Refresh an existing authentication token
 * @middleware verifyToken - Validates the current token
 * @middleware validateRequest - Validates refresh token request
 * @param {Object} req.body.refresh_token - Current refresh token
 * @returns {Object} New access and refresh tokens
 * @throws {AppError} 401 - Invalid refresh token
 */
router.post('/auth/refresh',
  verifyToken,
  validateRequest({
    body: userValidationSchemas.refreshToken
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await UserService.refreshToken(client, req.user.sys_id, req.body.refresh_token);
      });

      responseHandler.sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /auth/logout
 * @description Log out the current user and invalidate their session
 * @middleware verifyToken - Validates user authentication
 * @returns {null} No content
 * @throws {AppError} 401 - Unauthorized
 * @audit LOGOUT - Logs user logout in audit trail
 */
router.post('/auth/logout',
  verifyToken,
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await UserService.logout(client, req.user.sys_id);
        await auditLog(client, req.user, 'LOGOUT', {
          table: 'user_session',
          id: req.user.sys_id
        });
      });

      responseHandler.sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /auth/sso/:provider
 * @description Authenticate user using SSO provider
 * @middleware rateLimitPresets.STANDARD - Rate limiting for SSO attempts
 * @middleware validateRequest - Validates SSO parameters
 * @param {string} req.params.provider - SSO provider name
 * @param {Object} req.body.token - SSO authentication token
 * @param {Object} req.body.device_info - Device information
 * @returns {Object} User and session information
 * @throws {AppError} 400 - Invalid SSO parameters
 * @throws {AppError} 401 - Invalid SSO token
 * @audit SSO_LOGIN - Logs SSO login in audit trail
 */
router.post('/auth/sso/:provider',
  rateLimitPresets.STANDARD,
  validateRequest({
    params: userValidationSchemas.ssoProvider,
    body: userValidationSchemas.ssoToken
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const user = await UserService.loginWithSSO(
          client,
          req.params.provider,
          req.body.token
        );

        const session = await UserService.createSession(client, user.sys_id, req.body.device_info);

        await auditLog(client, user, 'SSO_LOGIN', {
          table: 'user_session',
          id: session.sys_id,
          new: session
        });

        return { user, session };
      });

      responseHandler.sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /auth/sso/link/:provider
 * @description Link SSO provider to existing account
 * @middleware rateLimitPresets.STRICT - Rate limiting for SSO linking
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates SSO parameters
 * @param {string} req.params.provider - SSO provider name
 * @param {Object} req.body.token - SSO authentication token
 * @returns {Object} Updated user details
 * @throws {AppError} 400 - Invalid SSO parameters
 * @throws {AppError} 409 - SSO account already linked
 * @audit LINK_SSO - Logs SSO linking in audit trail
 */
router.post('/auth/sso/link/:provider',
  rateLimitPresets.STRICT,
  verifyToken,
  validateRequest({
    params: userValidationSchemas.ssoProvider,
    body: userValidationSchemas.ssoToken
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const user = await UserService.linkSSOAccount(
          client,
          req.user.sys_id,
          req.params.provider,
          req.body.token
        );

        await auditLog(client, req.user, 'LINK_SSO', {
          table: 'sys_user',
          id: user.sys_id,
          old: { sso_provider: null },
          new: { sso_provider: req.params.provider }
        });

        return user;
      });

      responseHandler.sendUpdated(res, result);
    } catch (err) {
      next(err);
    }
  }
);

// Password Reset Routes
router.post('/auth/password/reset-request',
  rateLimitPresets.AUTH.PASSWORD_RESET,
  validateRequest({
    body: userValidationSchemas.passwordResetRequest
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await UserService.requestPasswordReset(client, req.body.email);
      });

      responseHandler.sendSuccess(res, null, 'Password reset email sent');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /auth/password/reset
 * @description Reset user password using reset token
 * @middleware validateRequest - Validates password reset parameters
 * @param {string} req.body.token - Password reset token
 * @param {string} req.body.new_password - New password
 * @returns {Object} Updated user details
 * @throws {AppError} 400 - Invalid reset parameters
 * @throws {AppError} 401 - Invalid reset token
 * @audit PASSWORD_RESET - Logs password reset in audit trail
 */
router.post('/auth/password/reset',
  validateRequest({
    body: userValidationSchemas.passwordReset
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const user = await UserService.resetPassword(
          client,
          req.body.token,
          req.body.new_password
        );

        await auditLog(client, user, 'PASSWORD_RESET', {
          table: 'sys_user',
          id: user.sys_id
        });

        return user;
      });

      responseHandler.sendSuccess(res, result, 'Password reset successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /verify-email
 * @description Verify user's email address
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates verification token
 * @param {string} req.body.token - Email verification token
 * @returns {Object} Updated user details
 * @throws {AppError} 400 - Invalid verification token
 * @audit VERIFY_EMAIL - Logs email verification in audit trail
 */
router.post('/verify-email',
  verifyToken,
  validateRequest({
    body: userValidationSchemas.emailVerification
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const user = await UserService.verifyEmail(
          client,
          req.user.sys_id,
          req.body.token
        );

        await auditLog(client, req.user, 'VERIFY_EMAIL', {
          table: 'sys_user',
          id: user.sys_id,
          old: { email_verified: false },
          new: { email_verified: true }
        });

        return user;
      });

      responseHandler.sendSuccess(res, result, 'Email verified successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /notifications
 * @description Retrieve user notifications with pagination
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates query parameters
 * @middleware createCacheMiddleware - Handles response caching
 * @param {boolean} req.query.unread - Filter for unread notifications
 * @param {number} req.query.limit - Number of notifications to return
 * @param {number} req.query.offset - Number of notifications to skip
 * @returns {Object} Paginated list of notifications
 * @throws {AppError} 401 - Unauthorized
 * @cache Uses PROFILE cache pattern with notifications filter
 */
router.get('/notifications',
  verifyToken,
  validateRequest({
    query: userValidationSchemas.notificationQuery
  }),
  createCacheMiddleware(
    'PROFILE',
    (req) => CACHE_PATTERNS.PROFILE(req.user.sys_id, `notifications-${req.query.unread}-${req.query.offset}`)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await UserService.getNotifications(client, req.user.sys_id, {
          limit: parseInt(req.query.limit) || 50,
          offset: parseInt(req.query.offset) || 0,
          unreadOnly: req.query.unread === 'true'
        });
      });

      responseHandler.sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /notifications/:id/read
 * @description Mark a notification as read
 * @middleware verifyToken - Validates user authentication
 * @middleware validateRequest - Validates notification ID
 * @param {string} req.params.id - Notification's unique identifier
 * @returns {Object} Updated notification details
 * @throws {AppError} 404 - Notification not found
 */
router.put('/notifications/:id/read',
  verifyToken,
  validateRequest({
    params: userValidationSchemas.notificationId
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await UserService.markNotificationRead(client, req.user.sys_id, req.params.id);
      });

      responseHandler.sendUpdated(res, result, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }
);

// Session Management Routes
router.delete('/sessions/:sessionId', 
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await UserService.invalidateSession(client, req.params.sessionId);

        await auditLog(client, req.user, 'INVALIDATE_SESSION', {
          table: 'user_session',
          id: req.params.sessionId
        });
      });

      responseHandler.sendDeleted(res, { message: 'Session invalidated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /departments
 * @description Retrieve list of departments with pagination
 * @middleware verifyToken - Validates user authentication
 * @middleware checkPermission - Ensures user has VIEW_DEPARTMENTS permission
 * @middleware validateRequest - Validates pagination parameters
 * @middleware createCacheMiddleware - Handles response caching
 * @param {number} req.query.limit - Number of records to return
 * @param {number} req.query.offset - Number of records to skip
 * @param {string} req.query.search - Search term for filtering departments
 * @returns {Object} Paginated list of departments
 * @throws {AppError} 403 - Insufficient permissions
 */
router.get('/departments',
  verifyToken,
  checkPermission(PERMISSIONS.VIEW_DEPARTMENTS),
  validateRequest({
    query: commonSchemas.pagination
  }),
  createCacheMiddleware(
    'PROFILE',
    (req) => CACHE_PATTERNS.PROFILE('departments', `${req.query.search}-${req.query.offset}`)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await UserService.getDepartments(
          client,
          {
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0,
            search: req.query.search
          }
        );
      });

      responseHandler.sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /departments/:departmentId/assign
 * @description Assign a user to a department
 * @middleware verifyToken - Validates user authentication
 * @middleware checkPermission - Ensures user has MANAGE_DEPARTMENTS permission
 * @middleware validateRequest - Validates assignment parameters
 * @param {string} req.params.departmentId - Department's unique identifier
 * @param {string} req.body.user_id - User to assign
 * @returns {Object} Assignment details
 * @throws {AppError} 403 - Insufficient permissions
 * @throws {AppError} 404 - Department or user not found
 * @audit ASSIGN_TO_DEPARTMENT - Logs department assignment in audit trail
 */
router.post('/departments/:departmentId/assign',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_DEPARTMENTS),
  validateRequest({
    params: commonSchemas.uuid,
    body: userValidationSchemas.departmentAssignment
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const assignment = await UserService.assignUserToDepartment(
          client,
          req.body.user_id,
          req.params.departmentId
        );

        await auditLog(client, req.user, 'ASSIGN_TO_DEPARTMENT', {
          table: 'department_assignment',
          id: assignment.sys_id,
          new: assignment
        });

        return assignment;
      });

      responseHandler.sendCreated(res, result, 'User assigned to department successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route PUT /password
 * @description Update user's password
 * @middleware verifyToken - Validates user authentication
 * @middleware rateLimitPresets.AUTH.PASSWORD_RESET - Rate limiting for password updates
 * @middleware validateRequest - Validates password update parameters
 * @param {string} req.body.old_password - Current password
 * @param {string} req.body.new_password - New password
 * @returns {Object} Success message
 * @throws {AppError} 401 - Invalid current password
 * @audit PASSWORD_UPDATE - Logs password update in audit trail
 * @cache Clears user profile cache
 */
router.put('/password',
  verifyToken,
  rateLimitPresets.AUTH.PASSWORD_RESET,
  validateRequest({
    body: userValidationSchemas.passwordUpdate
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const user = await UserService.updatePassword(
          client,
          req.user.sys_id,
          req.body.old_password,
          req.body.new_password
        );

        await auditLog(client, req.user, 'PASSWORD_UPDATE', {
          table: 'sys_user',
          id: user.sys_id
        });

        CACHE_CLEAR_PATTERNS.PROFILE_UPDATE(req.user.sys_id).forEach(key => 
          cacheManager.clear(CACHE_NAMES.USER, key)
        );
        return user;
      });

      responseHandler.sendSuccess(res, result, 'Password updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /sessions
 * @description Create a new user session
 * @middleware rateLimitPresets.STANDARD - Rate limiting for session creation
 * @middleware validateRequest - Validates session parameters
 * @param {string} req.body.user_id - User's unique identifier
 * @param {Object} req.body.device_info - Device information
 * @returns {Object} Created session details
 * @throws {AppError} 404 - User not found
 * @audit SESSION_CREATE - Logs session creation in audit trail
 */
router.post('/sessions',
  rateLimitPresets.STANDARD,
  validateRequest({
    body: userValidationSchemas.sessionCreate
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const session = await UserService.createSession(
          client,
          req.body.user_id,
          req.body.device_info
        );

        await auditLog(client, { sys_id: req.body.user_id }, 'SESSION_CREATE', {
          table: 'user_session',
          id: session.sys_id,
          new: session
        });

        return session;
      });

      responseHandler.sendCreated(res, result, 'Session created successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;