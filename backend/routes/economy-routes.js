/**
 * @module EconomyRoutes
 * @description Routes for the economy system including currency, shops, inventory, and trading
 */

const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { withTransaction, auditLog, handleImageUpload, validatePermissions } = require('../utils/routeHelpers');
const AppError = require('../utils/appError');
const EconomyService = require('../services/EconomyService');
const { verifyToken } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const { responseHandler } = require('../utils/responseHandler');
const { economyValidationSchemas, schemas: { commonSchemas } } = require('../utils/schemas');
const { checkPermission, PERMISSIONS } = require('../utils/permissionService');
const { rateLimitPresets } = require('../utils/rateLimits');
const Joi = require('joi');
const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');
const { uploadService } = require('../utils/fileUpload');
const { createCacheMiddleware } = require('../middleware/cacheMiddleware');
const { CACHE_PATTERNS, CACHE_CLEAR_PATTERNS } = require('../utils/cacheConfig');
const crudFactory = require('../utils/crudFactory');
const { asyncHandler } = require('../utils/errorHandler');

// Constants
const BALANCE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SHOP_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Error Types
const ERROR_TYPES = {
  COMPETITOR_NOT_FOUND: 'COMPETITOR_NOT_FOUND',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  SHOP_NOT_FOUND: 'SHOP_NOT_FOUND',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  ITEM_OUT_OF_STOCK: 'ITEM_OUT_OF_STOCK',
  ITEM_NOT_AVAILABLE: 'ITEM_NOT_AVAILABLE',
  INVALID_TRANSFER: 'INVALID_TRANSFER',
  TRANSFER_LIMIT_EXCEEDED: 'TRANSFER_LIMIT_EXCEEDED'
};

// Cache clearing utility
const clearEconomyCache = (userId) => {
  cacheManager.clear(CACHE_NAMES.ECONOMY, `balance-${userId}`);
  cacheManager.clear(CACHE_NAMES.ECONOMY, 'shops');
};

// Create the router using crudFactory
const router = crudFactory({
  resourceName: 'economy',
  schema: economyValidationSchemas.transaction,
  middleware: [verifyToken],
  permissions: {
    create: PERMISSIONS.MANAGE_ECONOMY,
    read: PERMISSIONS.VIEW_ECONOMY,
    update: PERMISSIONS.MANAGE_ECONOMY,
    delete: PERMISSIONS.MANAGE_ECONOMY
  },
  validations: {
    create: {
      body: economyValidationSchemas.transaction
    },
    update: {
      body: economyValidationSchemas.transactionUpdate
    }
  },
  audit: true,
  customRoutes: (router) => {
    // Currency Routes
    router.get('/balance/:competitorId',
      rateLimitPresets.STANDARD,
      validateRequest({
        params: commonSchemas.uuid
      }),
      createCacheMiddleware(
        'BALANCE',
        (req) => CACHE_PATTERNS.BALANCE(req.params.competitorId)
      ),
      asyncHandler(async (req, res) => {
        const result = await EconomyService.getBalance(req.params.competitorId);
        responseHandler.sendSuccess(res, result);
      })
    );

    router.post('/transfer',
      rateLimitPresets.ECONOMY.TRANSFER,
      validateRequest({
        body: economyValidationSchemas.transfer
      }),
      asyncHandler(async (req, res) => {
        const transfer = await EconomyService.transferCurrency(
          req.user.sys_id,
          req.body.to_competitor_id,
          req.body.amount,
          req.body.reason
        );

        responseHandler.sendCreated(res, transfer, 'Currency transferred successfully');
      })
    );

    router.get('/history/:competitorId',
      validateRequest({
        params: commonSchemas.uuid,
        query: commonSchemas.pagination
      }),
      asyncHandler(async (req, res) => {
        const result = await EconomyService.getCurrencyHistory(
          req.params.competitorId,
          { 
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
          }
        );
        
        responseHandler.sendSuccess(res, result);
      })
    );

    // Shop Routes
    router.post('/shops',
      checkPermission(PERMISSIONS.MANAGE_ECONOMY),
      uploadService.handle('icons'),
      validateRequest({
        body: economyValidationSchemas.shop
      }),
      asyncHandler(async (req, res) => {
        let iconUrl = null;
        if (req.file) {
          iconUrl = await uploadService.processAndSave(
            req.file,
            'icons',
            'shop-icons'
          );
        }

        const shop = await EconomyService.createShop({
          ...req.body,
          icon_url: iconUrl
        });

        responseHandler.sendCreated(res, shop, 'Shop created successfully');
      })
    );

    router.get('/shops/:id',
      validateRequest({
        params: commonSchemas.uuid,
        query: economyValidationSchemas.shopQuery
      }),
      createCacheMiddleware(
        'SHOP',
        (req) => CACHE_PATTERNS.SHOP(req.params.id, req.query),
        (req, data) => data && !data.error // Only cache successful responses
      ),
      asyncHandler(async (req, res) => {
        const shop = await EconomyService.getShopDetails(req.params.id);
        responseHandler.sendSuccess(res, shop);
      })
    );

    router.post('/shops/:id/items',
      checkPermission(PERMISSIONS.MANAGE_ECONOMY),
      uploadService.handle('icons'),
      validateRequest({
        params: commonSchemas.uuid,
        body: economyValidationSchemas.shopItem
      }),
      asyncHandler(async (req, res) => {
        let iconUrl = null;
        if (req.file) {
          iconUrl = await uploadService.processAndSave(
            req.file,
            'icons',
            'shop-items'
          );
        }

        const item = await EconomyService.addShopItem({
          ...req.body,
          shop_id: req.params.id,
          icon_url: iconUrl
        });

        responseHandler.sendSuccess(res, item, 'Shop item added successfully');
      })
    );

    router.post('/items/:id/purchase',
      rateLimitPresets.ECONOMY.PURCHASE,
      validateRequest({
        params: commonSchemas.uuid,
        body: economyValidationSchemas.purchase
      }),
      asyncHandler(async (req, res) => {
        const purchase = await EconomyService.purchaseItem(
          req.params.id,
          req.user.sys_id,
          req.body.quantity
        );

        responseHandler.sendSuccess(res, purchase, 'Item purchased successfully');
      })
    );

    // Inventory Routes
    router.get('/inventory/:competitorId',
      validateRequest({
        params: commonSchemas.uuid,
        query: economyValidationSchemas.inventoryQuery
      }),
      asyncHandler(async (req, res) => {
        const inventory = await EconomyService.getInventory(
          req.params.competitorId,
          req.query.include_used
        );
        
        responseHandler.sendSuccess(res, inventory);
      })
    );

    router.post('/inventory/:itemId/use',
      validateRequest({
        params: commonSchemas.uuid,
        body: economyValidationSchemas.useItem
      }),
      asyncHandler(async (req, res) => {
        const usage = await EconomyService.useInventoryItem(
          req.user.sys_id,
          req.params.itemId,
          req.body.quantity
        );

        responseHandler.sendSuccess(res, usage, 'Item used successfully');
      })
    );

    // Reward Routes
    router.post('/rewards/daily',
      asyncHandler(async (req, res) => {
        const reward = await EconomyService.claimDailyReward(req.user.sys_id);
        responseHandler.sendSuccess(res, reward, 'Daily reward claimed successfully');
      })
    );

    // Trading System Routes
    router.post('/trades',
      validateRequest({
        body: economyValidationSchemas.trade
      }),
      asyncHandler(async (req, res) => {
        const trade = await EconomyService.createTrade({
          ...req.body,
          initiator_id: req.user.sys_id
        });

        responseHandler.sendCreated(res, trade, 'Trade created successfully');
      })
    );

    router.get('/trades/:id', 
      validateRequest({
        params: commonSchemas.uuid
      }),
      createCacheMiddleware(
        'ECONOMY',
        (req) => CACHE_PATTERNS.SHOP(req.params.id, 'trade')
      ),
      asyncHandler(async (req, res) => {
        const tradeDetails = await EconomyService.getTradeDetails(req.params.id);
        responseHandler.sendUpdated(res, tradeDetails);
      })
    );

    router.post('/trades/:id/respond',
      validateRequest({
        params: commonSchemas.uuid,
        body: economyValidationSchemas.tradeResponse
      }),
      asyncHandler(async (req, res) => {
        const trade = await EconomyService.respondToTrade(
          req.params.id,
          req.user.sys_id,
          req.body.accept
        );

        responseHandler.sendUpdated(res, trade);
      })
    );

    // Economy Metrics Routes
    router.get('/metrics/:gameId',
      rateLimitPresets.STANDARD,
      validateRequest({
        params: commonSchemas.uuid,
        query: economyValidationSchemas.metricsQuery
      }),
      checkPermission(PERMISSIONS.VIEW_ECONOMY_STATS),
      createCacheMiddleware(
        'ECONOMY',
        (req) => CACHE_PATTERNS.SHOP(req.params.gameId, `metrics-${req.query.timeframe}-${req.query.granularity}`)
      ),
      asyncHandler(async (req, res) => {
        const metrics = await EconomyService.getEconomyMetrics(
          req.params.gameId,
          req.query.timeframe,
          req.query.granularity
        );

        responseHandler.sendSuccess(res, metrics);
      })
    );

    // Currency Exchange Rates
    router.get('/exchange-rates',
      validateRequest({
        query: economyValidationSchemas.exchangeRateQuery
      }),
      createCacheMiddleware(
        'ECONOMY',
        (req) => CACHE_PATTERNS.SHOP('exchange', `${req.query.base}-${req.query.targets}`)
      ),
      asyncHandler(async (req, res) => {
        const rates = await EconomyService.getExchangeRates(
          req.query.base,
          req.query.targets
        );
        
        responseHandler.sendSuccess(res, rates);
      })
    );

    // Bulk Item Operations
    router.post('/items/bulk',
      checkPermission(PERMISSIONS.MANAGE_ECONOMY),
      rateLimitPresets.BULK,
      validateRequest({
        body: Joi.array().items(
          economyValidationSchemas.shopItem
        ).min(1)
      }),
      asyncHandler(async (req, res) => {
        const items = await EconomyService.bulkCreateItems(req.body);
        responseHandler.sendSuccess(res, items, 'Bulk items created successfully');
      })
    );

    // Market Listings
    router.get('/market',
      validateRequest({
        query: economyValidationSchemas.marketQuery
      }),
      createCacheMiddleware(
        'ECONOMY',
        (req) => CACHE_PATTERNS.SHOP('market', JSON.stringify(req.query))
      ),
      asyncHandler(async (req, res) => {
        const listings = await EconomyService.getMarketListings(req.query);
        responseHandler.sendSuccess(res, listings);
      })
    );

    return router;
  }
});

module.exports = router; 