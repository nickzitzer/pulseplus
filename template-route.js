const express = require('express');
const router = express.Router();
const { validateRequest, withTransaction } = require('../utils/validation');
const { auditLog } = require('../utils/routeHelpers');
const { verifyToken, checkPermissions } = require('../middleware/auth');
const { AppError } = require('../utils/appError');
const SomeService = require('../services/SomeService');
const { schemas } = require('../utils/schemas');

// Use crudFactory for standard CRUD operations
module.exports = crudFactory({
  resourceName: 'resource_name',
  schema: schemas.resourceSchema,
  middleware: [verifyToken],
  validations: {
    create: {
      body: schemas.resourceSchema.create
    },
    update: {
      body: schemas.resourceSchema.update
    }
  },
  customEndpoints: (router) => {
    // GET collection
    router.get('/',
      verifyToken,
      checkPermissions(['REQUIRED_PERMISSION']),
      validateRequest(schemas.resource.list),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            // Get data using service
            const data = await SomeService.listItems(client, req.query);
            return data;
          });

          res.json(result);
        } catch (error) {
          next(error);
        }
      }
    );

    // GET single resource
    router.get('/:id',
      verifyToken,
      validateRequest(schemas.resource.get),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const item = await SomeService.getItem(client, req.params.id);
            if (!item) {
              throw new AppError('Resource not found', 404);
            }
            return item;
          });

          res.json(result);
        } catch (error) {
          next(error);
        }
      }
    );

    // POST new resource
    router.post('/',
      verifyToken,
      checkPermissions(['CREATE_PERMISSION']),
      validateRequest(schemas.resource.create),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const created = await SomeService.createItem(client, req.body);
            
            await auditLog(client, req.user, 'CREATE', {
              table: 'resource_table',
              id: created.sys_id,
              new: created
            });

            return created;
          });

          res.status(201).json(result);
        } catch (error) {
          next(error);
        }
      }
    );

    return router;
  }
}); 