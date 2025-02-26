/**
 * @module routeFactory
 * @description Factory for creating standardized route handlers with consistent error handling
 * @requires express
 * @requires ./errorHandler
 * @requires ./validation
 * @requires ./responseHandler
 * @requires ./rateLimits
 * @requires ../middleware/auth
 */

const { asyncHandler } = require('./errorHandler');
const { validateRequest } = require('./validation');
const { responseHandler } = require('./responseHandler');
const { rateLimitPresets } = require('./rateLimits');
const { verifyToken, checkPermissions } = require('../middleware/auth');

/**
 * @typedef {Object} RouteOptions
 * @property {boolean} [isProtected=true] - Whether the route requires authentication
 * @property {string[]} [permissions=[]] - Required permissions for the route
 * @property {Object} [validation=null] - Validation schemas for request
 * @property {Object} [rateLimit=null] - Rate limiting configuration
 * @property {boolean} [audit=false] - Whether to audit the route
 * @property {string} [auditAction=''] - Audit action name
 */

/**
 * @function createRoute
 * @description Creates a standardized route handler with consistent error handling
 * @param {Function} handler - Route handler function
 * @param {RouteOptions} options - Route configuration options
 * @returns {Function[]} Array of middleware functions
 * @example
 * router.get('/users',
 *   ...createRoute(
 *     async (req, res) => {
 *       const users = await UserService.getUsers();
 *       responseHandler.sendSuccess(res, users);
 *     },
 *     {
 *       isProtected: true,
 *       permissions: ['VIEW_USERS'],
 *       validation: {
 *         query: querySchema
 *       },
 *       rateLimit: rateLimitPresets.STANDARD
 *     }
 *   )
 * );
 */
const createRoute = (handler, options = {}) => {
  const {
    isProtected = true,
    permissions = [],
    validation = null,
    rateLimit = null,
    audit = false,
    auditAction = ''
  } = options;
  
  const middlewares = [];
  
  // Add rate limiting if specified
  if (rateLimit) {
    middlewares.push(rateLimit);
  }
  
  // Add authentication if route is protected
  if (isProtected) {
    middlewares.push(verifyToken);
  }
  
  // Add permission checking if permissions are specified
  if (permissions.length > 0) {
    middlewares.push(checkPermissions(permissions));
  }
  
  // Add validation if specified
  if (validation) {
    middlewares.push(validateRequest(validation));
  }
  
  // Add the handler with async error handling
  middlewares.push(asyncHandler(async (req, res, next) => {
    // Add audit logging if specified
    if (audit && auditAction) {
      const { auditLog } = require('./routeHelpers');
      await auditLog(null, req.user, auditAction, {
        path: req.path,
        method: req.method,
        params: req.params,
        query: req.query,
        body: req.body
      });
    }
    
    // Call the handler
    await handler(req, res, next);
  }));
  
  return middlewares;
};

/**
 * @function createCrudRoutes
 * @description Creates standardized CRUD routes for a resource
 * @param {Object} router - Express router
 * @param {Object} service - Service with CRUD methods
 * @param {Object} options - CRUD route options
 * @returns {void}
 * @example
 * createCrudRoutes(router, UserService, {
 *   basePath: '',
 *   validation: {
 *     create: createSchema,
 *     update: updateSchema
 *   },
 *   permissions: {
 *     create: ['CREATE_USER'],
 *     read: ['VIEW_USER'],
 *     update: ['UPDATE_USER'],
 *     delete: ['DELETE_USER']
 *   }
 * });
 */
const createCrudRoutes = (router, service, options = {}) => {
  const {
    basePath = '',
    validation = {},
    permissions = {},
    rateLimits = {},
    audit = true
  } = options;
  
  // CREATE
  router.post(
    basePath,
    ...createRoute(
      async (req, res) => {
        const result = await service.create(req.body, req.user);
        responseHandler.sendCreated(res, result);
      },
      {
        isProtected: true,
        permissions: permissions.create || [],
        validation: { body: validation.create },
        rateLimit: rateLimits.create || rateLimitPresets.STANDARD,
        audit: audit,
        auditAction: 'CREATE'
      }
    )
  );
  
  // READ ALL
  router.get(
    basePath,
    ...createRoute(
      async (req, res) => {
        const result = await service.findAll(req.query, req.user);
        responseHandler.sendSuccess(res, result);
      },
      {
        isProtected: true,
        permissions: permissions.read || [],
        validation: { query: validation.query },
        rateLimit: rateLimits.read || rateLimitPresets.STANDARD
      }
    )
  );
  
  // READ ONE
  router.get(
    `${basePath}/:id`,
    ...createRoute(
      async (req, res) => {
        const result = await service.findById(req.params.id, req.user);
        responseHandler.sendSuccess(res, result);
      },
      {
        isProtected: true,
        permissions: permissions.read || [],
        validation: { params: validation.params },
        rateLimit: rateLimits.read || rateLimitPresets.STANDARD
      }
    )
  );
  
  // UPDATE
  router.put(
    `${basePath}/:id`,
    ...createRoute(
      async (req, res) => {
        const result = await service.update(req.params.id, req.body, req.user);
        responseHandler.sendUpdated(res, result);
      },
      {
        isProtected: true,
        permissions: permissions.update || [],
        validation: {
          params: validation.params,
          body: validation.update
        },
        rateLimit: rateLimits.update || rateLimitPresets.STRICT,
        audit: audit,
        auditAction: 'UPDATE'
      }
    )
  );
  
  // DELETE
  router.delete(
    `${basePath}/:id`,
    ...createRoute(
      async (req, res) => {
        await service.delete(req.params.id, req.user);
        responseHandler.sendSuccess(res, { id: req.params.id }, 'Resource deleted successfully');
      },
      {
        isProtected: true,
        permissions: permissions.delete || [],
        validation: { params: validation.params },
        rateLimit: rateLimits.delete || rateLimitPresets.STRICT,
        audit: audit,
        auditAction: 'DELETE'
      }
    )
  );
};

module.exports = {
  createRoute,
  createCrudRoutes
}; 