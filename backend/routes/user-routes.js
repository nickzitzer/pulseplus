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
const { userValidationSchemas } = require('../utils/schemas');
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
const { asyncHandler } = require('../utils/errorHandler');

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

// Create the base router using crudFactory
const baseRouter = crudFactory({
  resourceName: 'user',
  schema: userValidationSchemas.user,
  middleware: [verifyToken],
  validations: {
    create: {
      body: userValidationSchemas.register
    },
    update: {
      body: userValidationSchemas.userUpdate
    },
    list: {
      query: userValidationSchemas.pagination
    }
  },
  permissions: {
    create: PERMISSIONS.MANAGE_USERS,
    read: PERMISSIONS.VIEW_USERS,
    update: PERMISSIONS.MANAGE_USERS,
    delete: PERMISSIONS.MANAGE_USERS
  },
  audit: true,
  transformResponse: (data) => {
    // Remove sensitive fields
    if (Array.isArray(data)) {
      return data.map(user => {
        const { password_hash, ...rest } = user;
        return rest;
      });
    } else if (data) {
      const { password_hash, ...rest } = data;
      return rest;
    }
    return data;
  },
  customRoutes: (router) => {
    // Enhanced Profile Endpoint with caching
    router.get('/profile',
      verifyToken,
      createCacheMiddleware(
        'PROFILE',
        (req) => CACHE_PATTERNS.PROFILE(req.user.sys_id)
      ),
      asyncHandler(async (req, res) => {
        const result = await UserService.getUserProfile(null, req.user.sys_id);
        responseHandler.sendSuccess(res, result);
      })
    );

    // Settings Management
    router.put('/settings',
      verifyToken,
      validateRequest({
        body: userValidationSchemas.userSettings
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.updateUserSettings(
          null,
          req.user.sys_id,
          req.body
        );
        responseHandler.sendSuccess(res, result);
      })
    );

    // Avatar Customization
    router.put('/avatar',
      verifyToken,
      uploadService.handle('avatar'),
      validateRequest(userValidationSchemas.userAvatar),
      asyncHandler(async (req, res) => {
        // Process avatar upload
        const avatarUrl = await uploadService.processAndSave(
          req.file, 
          'avatar',
          'user-avatars'
        );
        
        // Call service directly
        const avatar = await UserService.updateAvatarCustomization(
          req.user.sys_id,
          { avatar_url: avatarUrl }
        );

        responseHandler.sendSuccess(res, avatar, 'Avatar updated successfully');
      })
    );

    // User Preferences
    router.get('/preferences',
      verifyToken,
      createCacheMiddleware(
        'PREFERENCES',
        (req) => CACHE_PATTERNS.PROFILE(req.user.sys_id)
      ),
      asyncHandler(async (req, res) => {
        const preferences = await UserService.getUserPreferences(null, req.user.sys_id);
        responseHandler.sendSuccess(res, preferences);
      })
    );

    router.put('/preferences',
      verifyToken,
      validateRequest({ body: userValidationSchemas.userPreferences }),
      asyncHandler(async (req, res) => {
        const result = await UserService.updateUserPreferences(null, req.user.sys_id, req.body);
        responseHandler.sendUpdated(res, result);
      })
    );

    // Enhanced Session Management
    router.get('/sessions',
      verifyToken,
      validateRequest({
        query: userValidationSchemas.pagination
      }),
      createCacheMiddleware(
        'SESSIONS',
        (req) => CACHE_PATTERNS.SESSIONS(req.user.sys_id)
      ),
      asyncHandler(async (req, res) => {
        const result = await UserService.getUserSessions(
          null, 
          req.user.sys_id,
          {
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
          }
        );
        responseHandler.sendSuccess(res, result);
      })
    );

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
        params: userValidationSchemas.uuid
      }),
      createCacheMiddleware(
        'PROFILE',
        (req) => CACHE_PATTERNS.PROFILE(req.params.userId)
      ),
      asyncHandler(async (req, res) => {
        const customization = await UserService.getProfileCustomization(null, req.params.userId);
        responseHandler.sendUpdated(res, customization);
      })
    );

    router.put('/:userId/customization',
      validateRequest({
        params: userValidationSchemas.uuid,
        body: userValidationSchemas.profileCustomization
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.updateProfileCustomization(null, req.params.userId, req.body);
        responseHandler.sendUpdated(res, result);
      })
    );

    // Authentication routes
    // These routes don't use the standard CRUD pattern and don't require authentication

    /**
     * @route POST /auth/login
     * @description Authenticate user and create a new session
     */
    router.post('/auth/login',
      rateLimitPresets.STRICT,
      validateRequest({
        body: userValidationSchemas.login
      }),
      asyncHandler(async (req, res) => {
        const { email, password, device_info } = req.body;
        const result = await UserService.authenticateUser(email, password, device_info);
        responseHandler.sendSuccess(res, result, 'Login successful');
      })
    );

    /**
     * @route POST /auth/register
     * @description Register a new user account
     */
    router.post('/auth/register',
      rateLimitPresets.AUTH.REGISTER,
      validateRequest({
        body: userValidationSchemas.register
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.register(null, req.body);
        responseHandler.sendCreated(res, result, 'User registered successfully');
      })
    );

    /**
     * @route POST /auth/refresh
     * @description Refresh an existing authentication token
     */
    router.post('/auth/refresh',
      verifyToken,
      validateRequest({
        body: userValidationSchemas.refreshToken
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.refreshToken(null, req.user.sys_id, req.body.refresh_token);
        responseHandler.sendSuccess(res, result, 'Token refreshed successfully');
      })
    );

    /**
     * @route POST /auth/logout
     * @description Log out the current user and invalidate their session
     */
    router.post('/auth/logout',
      verifyToken,
      asyncHandler(async (req, res) => {
        await UserService.logout(null, req.user.sys_id);
        responseHandler.sendSuccess(res, null, 'Logged out successfully');
      })
    );

    /**
     * @route POST /auth/sso/:provider
     * @description Authenticate user using SSO provider
     */
    router.post('/auth/sso/:provider',
      rateLimitPresets.STANDARD,
      validateRequest({
        params: userValidationSchemas.ssoProvider,
        body: userValidationSchemas.ssoToken
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.loginWithSSO(
          null,
          req.params.provider,
          req.body.token
        );
        responseHandler.sendSuccess(res, result);
      })
    );

    /**
     * @route POST /auth/sso/link/:provider
     * @description Link SSO provider to existing account
     */
    router.post('/auth/sso/link/:provider',
      rateLimitPresets.STRICT,
      verifyToken,
      validateRequest({
        params: userValidationSchemas.ssoProvider,
        body: userValidationSchemas.ssoToken
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.linkSSOAccount(
          null,
          req.user.sys_id,
          req.params.provider,
          req.body.token
        );
        responseHandler.sendUpdated(res, result);
      })
    );

    // Password Reset Routes
    router.post('/auth/password/reset-request',
      rateLimitPresets.AUTH.PASSWORD_RESET,
      validateRequest({
        body: userValidationSchemas.passwordResetRequest
      }),
      asyncHandler(async (req, res) => {
        await UserService.requestPasswordReset(null, req.body.email);
        responseHandler.sendSuccess(res, null, 'Password reset email sent');
      })
    );

    /**
     * @route POST /auth/password/reset
     * @description Reset user password using reset token
     */
    router.post('/auth/password/reset',
      validateRequest({
        body: userValidationSchemas.passwordReset
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.resetPassword(
          null,
          req.body.token,
          req.body.new_password
        );
        responseHandler.sendSuccess(res, result, 'Password reset successfully');
      })
    );

    /**
     * @route POST /verify-email
     * @description Verify user's email address
     */
    router.post('/verify-email',
      verifyToken,
      validateRequest({
        body: userValidationSchemas.emailVerification
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.verifyEmail(
          null,
          req.user.sys_id,
          req.body.token
        );
        responseHandler.sendSuccess(res, result, 'Email verified successfully');
      })
    );

    /**
     * @route GET /notifications
     * @description Retrieve user notifications with pagination
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
      asyncHandler(async (req, res) => {
        const result = await UserService.getNotifications(null, req.user.sys_id, {
          limit: parseInt(req.query.limit) || 50,
          offset: parseInt(req.query.offset) || 0,
          unreadOnly: req.query.unread === 'true'
        });
        responseHandler.sendSuccess(res, result);
      })
    );

    /**
     * @route PUT /notifications/:id/read
     * @description Mark a notification as read
     */
    router.put('/notifications/:id/read',
      verifyToken,
      validateRequest({
        params: userValidationSchemas.notificationId
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.markNotificationRead(null, req.user.sys_id, req.params.id);
        responseHandler.sendUpdated(res, result, 'Notification marked as read');
      })
    );

    // Session Management Routes
    router.delete('/sessions/:sessionId', 
      verifyToken,
      validateRequest({
        params: userValidationSchemas.uuid
      }),
      asyncHandler(async (req, res) => {
        await UserService.invalidateSession(null, req.params.sessionId);
        responseHandler.sendDeleted(res, { message: 'Session invalidated' });
      })
    );

    /**
     * @route GET /departments
     * @description Retrieve list of departments with pagination
     */
    router.get('/departments',
      verifyToken,
      checkPermission(PERMISSIONS.VIEW_DEPARTMENTS),
      validateRequest({
        query: userValidationSchemas.pagination
      }),
      createCacheMiddleware(
        'PROFILE',
        (req) => CACHE_PATTERNS.PROFILE('departments', `${req.query.search}-${req.query.offset}`)
      ),
      asyncHandler(async (req, res) => {
        const result = await UserService.getDepartments(
          null,
          {
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0,
            search: req.query.search
          }
        );
        responseHandler.sendSuccess(res, result);
      })
    );

    /**
     * @route POST /departments/:departmentId/assign
     * @description Assign a user to a department
     */
    router.post('/departments/:departmentId/assign',
      verifyToken,
      checkPermission(PERMISSIONS.MANAGE_DEPARTMENTS),
      validateRequest({
        params: userValidationSchemas.uuid,
        body: userValidationSchemas.departmentAssignment
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.assignUserToDepartment(
          null,
          req.body.user_id,
          req.params.departmentId
        );
        responseHandler.sendCreated(res, result, 'User assigned to department successfully');
      })
    );

    /**
     * @route PUT /password
     * @description Update user's password
     */
    router.put('/password',
      verifyToken,
      rateLimitPresets.AUTH.PASSWORD_RESET,
      validateRequest({
        body: userValidationSchemas.passwordUpdate
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.updatePassword(
          null,
          req.user.sys_id,
          req.body.old_password,
          req.body.new_password
        );
        responseHandler.sendSuccess(res, result, 'Password updated successfully');
      })
    );

    /**
     * @route POST /sessions
     * @description Create a new user session
     */
    router.post('/sessions',
      rateLimitPresets.STANDARD,
      validateRequest({
        body: userValidationSchemas.sessionCreate
      }),
      asyncHandler(async (req, res) => {
        const result = await UserService.createSession(
          null,
          req.body.user_id,
          req.body.device_info
        );
        responseHandler.sendCreated(res, result, 'Session created successfully');
      })
    );

    /**
     * @route POST /auth/test-csrf
     * @description Test route to verify CSRF protection
     */
    router.post('/auth/test-csrf', verifyToken, (req, res) => {
      responseHandler.sendSuccess(res, { message: 'CSRF protection working correctly' });
    });
  }
});

module.exports = baseRouter;