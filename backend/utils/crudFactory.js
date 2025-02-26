/**
 * @module crudFactory
 * @description Factory for creating standardized CRUD routes with Express
 * @requires express
 */

const express = require('express');
const { responseHandler } = require('./responseHandler');
const { validateRequest } = require('./validation');
const { AppError } = require('./appError');
const { asyncHandler } = require('./errorHandler');
const logger = require('./logger');
const { pool } = require('../database/connection');

/**
 * Creates a router with standardized CRUD routes
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.resourceName - Name of the resource (e.g., 'user', 'game')
 * @param {Object} [options.schema] - Validation schema for the resource
 * @param {Array} [options.middleware] - Middleware to apply to all routes
 * @param {Object} [options.validations] - Validation configurations for different operations
 * @param {Function} [options.customRoutes] - Function to add custom routes to the router
 * @param {boolean} [options.audit=false] - Whether to audit route actions
 * @param {Object} [options.permissions] - Permission requirements for different operations
 * @param {Function} [options.transformResponse] - Function to transform response data
 * @returns {express.Router} Express router with CRUD routes
 */
function crudFactory(options) {
  const {
    resourceName,
    schema,
    middleware = [],
    validations = {},
    customRoutes,
    audit = false,
    permissions = {},
    transformResponse
  } = options;

  // Create a new router
  const router = express.Router();

  // Apply middleware to all routes if provided
  if (middleware && middleware.length > 0) {
    router.use(middleware);
  }

  // Get the appropriate service based on resource name
  // This assumes a naming convention where the service is named like "UserService" for "user" resource
  const serviceName = resourceName.charAt(0).toUpperCase() + resourceName.slice(1) + 'Service';
  let Service;
  
  try {
    Service = require(`../services/${serviceName}`);
  } catch (error) {
    console.warn(`Service ${serviceName} not found. Default CRUD routes will not be fully functional.`);
    // Create a mock service to prevent errors
    Service = {
      create: async () => ({}),
      findAll: async () => ({ items: [], total: 0 }),
      findById: async () => ({}),
      update: async () => ({}),
      delete: async () => ({})
    };
  }

  // Helper function for audit logging
  const auditLog = async (action, user, details) => {
    if (!audit) return;
    
    try {
      // If you have an audit service, use it here
      // Otherwise log to your standard logger
      logger.info(`AUDIT: ${action} on ${resourceName}`, {
        action,
        resourceName,
        userId: user?.id,
        details
      });
    } catch (error) {
      logger.error('Failed to create audit log', { error });
    }
  };

  // Helper function to apply permission middleware if needed
  const checkPermission = (permission) => {
    if (!permission) return (req, res, next) => next();
    
    return (req, res, next) => {
      // Implement your permission checking logic here
      // This is a placeholder - replace with your actual permission checking
      if (!req.user || !req.user.permissions || !req.user.permissions.includes(permission)) {
        return next(new AppError('You do not have permission to perform this action', 403));
      }
      next();
    };
  };

  // Helper function to transform response if needed
  const transformData = (data) => {
    if (typeof transformResponse === 'function') {
      return transformResponse(data);
    }
    return data;
  };

  // Add standard CRUD routes
  
  // GET / - List all resources
  router.get('/', 
    validations.list ? validateRequest(validations.list) : (req, res, next) => next(),
    checkPermission(permissions.read),
    asyncHandler(async (req, res) => {
      const { 
        limit = 20, 
        offset = 0, 
        sort = 'created_at', 
        order = 'desc',
        ...filters 
      } = req.query;
      
      const result = await Service.findAll({ 
        limit: parseInt(limit), 
        offset: parseInt(offset),
        sort,
        order,
        filters
      });
      
      // Handle both object with items/total and plain array responses
      const items = Array.isArray(result) ? result : result.items;
      const total = Array.isArray(result) ? items.length : (result.total || items.length);
      
      responseHandler.sendSuccess(res, {
        items: transformData(items),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total
        }
      });
    })
  );

  // GET /:id - Get a specific resource by ID
  router.get('/:id', 
    validations.get ? validateRequest(validations.get) : (req, res, next) => next(),
    checkPermission(permissions.read),
    asyncHandler(async (req, res) => {
      const item = await Service.findById(req.params.id);
      
      if (!item) {
        throw new AppError(`${resourceName} not found`, 404);
      }
      
      responseHandler.sendSuccess(res, transformData(item));
    })
  );

  // POST / - Create a new resource
  router.post('/', 
    validations.create ? validateRequest(validations.create) : (req, res, next) => next(),
    checkPermission(permissions.create),
    asyncHandler(async (req, res) => {
      // Use a transaction if the service supports it
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        const newItem = await Service.create(req.body, req.user, client);
        
        await client.query('COMMIT');
        
        // Audit log the creation
        await auditLog('CREATE', req.user, { id: newItem.id || newItem.sys_id });
        
        responseHandler.sendCreated(res, transformData(newItem));
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })
  );

  // PUT /:id - Update a resource
  router.put('/:id', 
    validations.update ? validateRequest(validations.update) : (req, res, next) => next(),
    checkPermission(permissions.update),
    asyncHandler(async (req, res) => {
      // Use a transaction if the service supports it
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        const updatedItem = await Service.update(req.params.id, req.body, req.user, client);
        
        if (!updatedItem) {
          throw new AppError(`${resourceName} not found`, 404);
        }
        
        await client.query('COMMIT');
        
        // Audit log the update
        await auditLog('UPDATE', req.user, { id: req.params.id });
        
        responseHandler.sendSuccess(res, transformData(updatedItem));
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })
  );

  // DELETE /:id - Delete a resource
  router.delete('/:id', 
    validations.delete ? validateRequest(validations.delete) : (req, res, next) => next(),
    checkPermission(permissions.delete),
    asyncHandler(async (req, res) => {
      // Use a transaction if the service supports it
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        const deletedItem = await Service.delete(req.params.id, req.user, client);
        
        if (!deletedItem) {
          throw new AppError(`${resourceName} not found`, 404);
        }
        
        await client.query('COMMIT');
        
        // Audit log the deletion
        await auditLog('DELETE', req.user, { id: req.params.id });
        
        responseHandler.sendSuccess(res, transformData(deletedItem), `${resourceName} deleted successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })
  );

  // If customRoutes function is provided, call it with the router
  if (typeof customRoutes === 'function') {
    customRoutes(router);
  }

  return router;
}

module.exports = crudFactory; 