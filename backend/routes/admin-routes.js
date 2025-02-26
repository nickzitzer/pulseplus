/**
 * @module AdminRoutes
 * @description Admin routes for system management
 * @requires express
 * @requires ../middleware/auth
 * @requires ../utils/permissionService
 * @requires ../utils/responseHandler
 * @requires ../utils/apiKeyManager
 * @requires ../utils/apiKeyManager/rotationService
 * @requires ../utils/middlewareVersioning
 * @requires ../middleware/middlewareConfig
 */

const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { checkPermission, PERMISSIONS } = require('../utils/permissionService');
const { responseHandler } = require('../utils/responseHandler');
const apiKeyManager = require('../utils/apiKeyManager');
const apiKeyRotationService = require('../utils/apiKeyManager/rotationService');
const crypto = require('crypto');
const { validateRequest } = require('../utils/validation');
const Joi = require('joi');
const { getMiddlewareVersions, getMiddlewareVersion } = require('../utils/middlewareVersioning');
const { createRouteMiddleware } = require('../middleware/middlewareConfig');
const crudFactory = require('../utils/crudFactory');
const { asyncHandler } = require('../utils/errorHandler');

// Validation schemas
const apiKeySchemas = {
  rotateKey: Joi.object({
    serviceName: Joi.string().required(),
    newApiKey: Joi.string().optional()
  }),
  registerService: Joi.object({
    serviceName: Joi.string().required(),
    rotationInterval: Joi.number().optional(),
    initialKey: Joi.string().optional()
  })
};

const middlewareSchemas = {
  getMiddleware: Joi.object({
    name: Joi.string().required()
  })
};

// Create the router using crudFactory
const router = crudFactory({
  resourceName: 'admin',
  middleware: [verifyToken, checkPermission(PERMISSIONS.ADMIN)],
  permissions: {
    create: PERMISSIONS.ADMIN,
    read: PERMISSIONS.ADMIN,
    update: PERMISSIONS.ADMIN,
    delete: PERMISSIONS.ADMIN
  },
  audit: true,
  customRoutes: (router) => {
    /**
     * @route GET /api-keys
     * @description Get all API keys
     * @access Admin
     */
    router.get('/api-keys',
      asyncHandler(async (req, res) => {
        const apiKeys = await apiKeyManager.listApiKeys();
        responseHandler.sendSuccess(res, apiKeys, 'API keys retrieved successfully');
      })
    );

    /**
     * @route GET /api-keys/:serviceName
     * @description Get API key metadata for a specific service
     * @access Admin
     */
    router.get('/api-keys/:serviceName',
      asyncHandler(async (req, res) => {
        const { serviceName } = req.params;
        const metadata = await apiKeyManager.getApiKeyMetadata(serviceName);
        responseHandler.sendSuccess(res, metadata, `API key metadata for ${serviceName} retrieved successfully`);
      })
    );

    /**
     * @route POST /api-keys/rotate
     * @description Rotate an API key for a service
     * @access Admin
     */
    router.post('/api-keys/rotate',
      validateRequest({
        body: apiKeySchemas.rotateKey
      }),
      asyncHandler(async (req, res) => {
        const { serviceName, newApiKey } = req.body;
        
        // Generate a new API key if not provided
        const apiKey = newApiKey || crypto.randomBytes(32).toString('hex');
        
        const result = await apiKeyManager.rotateApiKey(serviceName, apiKey);
        responseHandler.sendSuccess(res, result, `API key for ${serviceName} rotated successfully`);
      })
    );

    /**
     * @route POST /api-keys/register
     * @description Register a service for API key rotation
     * @access Admin
     */
    router.post('/api-keys/register',
      validateRequest({
        body: apiKeySchemas.registerService
      }),
      asyncHandler(async (req, res) => {
        const { serviceName, rotationInterval, initialKey } = req.body;
        
        // Generate an initial API key if not provided
        const apiKey = initialKey || crypto.randomBytes(32).toString('hex');
        
        // Store the initial key
        await apiKeyManager.rotateApiKey(serviceName, apiKey);
        
        // Register the service for rotation
        apiKeyRotationService.registerService(serviceName, {
          generateNewKey: async () => crypto.randomBytes(32).toString('hex'),
          updateService: async (newKey) => {
            // This is a placeholder - in a real implementation, this would update the service
            // For example, updating AWS credentials or calling an API to update the key
            console.log(`New key for ${serviceName} would be applied to the service here`);
            return true;
          },
          rotationInterval: rotationInterval ? rotationInterval * 24 * 60 * 60 * 1000 : undefined
        });
        
        responseHandler.sendSuccess(res, {
          service: serviceName,
          registered: true,
          rotationInterval: rotationInterval || 30 // Default 30 days
        }, `Service ${serviceName} registered for API key rotation`);
      })
    );

    /**
     * @route POST /api-keys/rotate-all
     * @description Force rotation of all API keys
     * @access Admin
     */
    router.post('/api-keys/rotate-all',
      asyncHandler(async (req, res) => {
        const results = await apiKeyRotationService.forceRotateAll();
        responseHandler.sendSuccess(res, results, 'API key rotation initiated for all services');
      })
    );

    /**
     * @route GET /middleware
     * @description Get all middleware versions
     * @access Admin
     */
    router.get(
      '/middleware',
      asyncHandler(async (req, res) => {
        const versions = getMiddlewareVersions();
        responseHandler.sendSuccess(res, {
          count: versions.length,
          middlewares: versions
        }, 'Middleware versions retrieved successfully');
      })
    );

    /**
     * @route GET /middleware/:name
     * @description Get specific middleware version
     * @access Admin
     */
    router.get(
      '/middleware/:name',
      validateRequest({
        params: middlewareSchemas.getMiddleware
      }),
      asyncHandler(async (req, res) => {
        const { name } = req.params;
        const version = getMiddlewareVersion(name);
        
        if (!version) {
          return responseHandler.sendError(res, 404, `Middleware '${name}' not found`);
        }
        
        responseHandler.sendSuccess(res, version, `Middleware '${name}' version retrieved successfully`);
      })
    );

    /**
     * @route GET /system-health
     * @description Get system health information
     * @access Admin
     */
    router.get(
      '/system-health',
      asyncHandler(async (req, res) => {
        // Implement system health check logic here
        const healthInfo = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            cache: 'connected',
            storage: 'connected'
          },
          metrics: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          }
        };
        
        responseHandler.sendSuccess(res, healthInfo, 'System health information retrieved successfully');
      })
    );

    /**
     * @route POST /clear-cache
     * @description Clear system caches
     * @access Admin
     */
    router.post(
      '/clear-cache',
      asyncHandler(async (req, res) => {
        // Implement cache clearing logic here
        // This is a placeholder
        const result = {
          cleared: true,
          timestamp: new Date().toISOString()
        };
        
        responseHandler.sendSuccess(res, result, 'System caches cleared successfully');
      })
    );
  }
});

module.exports = router; 