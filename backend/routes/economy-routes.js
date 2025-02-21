const express = require('express');
const router = express.Router();
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

// Currency Routes
router.get('/balance/:competitorId',
  rateLimitPresets.STANDARD,
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  createCacheMiddleware(
    'BALANCE',
    (req) => CACHE_PATTERNS.BALANCE(req.params.competitorId)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if competitor exists
        const competitor = await EconomyService.getCompetitor(client, req.params.competitorId);
        if (!competitor) {
          throw new AppError('Competitor not found', 404, ERROR_TYPES.COMPETITOR_NOT_FOUND);
        }

        return await EconomyService.getCurrencyBalance(client, req.params.competitorId);
      });
      
      responseHandler.sendSuccess(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch balance', 500));
      }
    }
  }
);

router.post('/transfer',
  rateLimitPresets.ECONOMY.TRANSFER,
  verifyToken,
  validateRequest({
    body: economyValidationSchemas.transfer
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if competitors exist
        const [sender, receiver] = await Promise.all([
          EconomyService.getCompetitor(client, req.user.sys_id),
          EconomyService.getCompetitor(client, req.body.to_competitor_id)
        ]);

        if (!sender || !receiver) {
          throw new AppError('Competitor not found', 404, ERROR_TYPES.COMPETITOR_NOT_FOUND);
        }

        // Check if sender has sufficient balance
        const senderBalance = await EconomyService.getCurrencyBalance(client, req.user.sys_id);
        if (senderBalance.balance < req.body.amount) {
          throw new AppError('Insufficient balance', 400, ERROR_TYPES.INSUFFICIENT_BALANCE);
        }

        // Check transfer limits
        const dailyTransfers = await EconomyService.getDailyTransferAmount(client, req.user.sys_id);
        if (dailyTransfers + req.body.amount > process.env.DAILY_TRANSFER_LIMIT) {
          throw new AppError('Daily transfer limit exceeded', 400, ERROR_TYPES.TRANSFER_LIMIT_EXCEEDED);
        }

        const transfer = await EconomyService.transferCurrency(
          client,
          req.user.sys_id,
          req.body.to_competitor_id,
          req.body.amount,
          req.body.reason
        );

        // Clear cache for both parties using standardized patterns
        CACHE_CLEAR_PATTERNS.BALANCE_UPDATE(req.user.sys_id).forEach(key => 
          cacheManager.clear(CACHE_NAMES.ECONOMY, key)
        );
        CACHE_CLEAR_PATTERNS.BALANCE_UPDATE(req.body.to_competitor_id).forEach(key => 
          cacheManager.clear(CACHE_NAMES.ECONOMY, key)
        );

        await auditLog(client, req.user, 'CURRENCY_TRANSFER', {
          table: 'currency_transaction',
          id: transfer.sys_id,
          new: transfer
        });

        return transfer;
      });

      responseHandler.sendCreated(res, result, 'Currency transferred successfully');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to transfer currency', 500));
      }
    }
  }
);

router.get('/history/:competitorId',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    query: commonSchemas.pagination
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if competitor exists
        const competitor = await EconomyService.getCompetitor(client, req.params.competitorId);
        if (!competitor) {
          throw new AppError('Competitor not found', 404, ERROR_TYPES.COMPETITOR_NOT_FOUND);
        }

        return await EconomyService.getCurrencyHistory(
          client,
          req.params.competitorId,
          { 
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
          }
        );
      });
      responseHandler.sendSuccess(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch currency history', 500));
      }
    }
  }
);

// Shop Routes
router.post('/shops',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_ECONOMY),
  uploadService.handle('icons'),
  validateRequest({
    body: economyValidationSchemas.shop
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Verify game permissions
        try {
          await validatePermissions(client, req.user.sys_id, req.body.game_id, ['MANAGE_GAME']);
        } catch (error) {
          throw new AppError('Not authorized to manage this game', 403);
        }

        let iconUrl = null;
        if (req.file) {
          try {
            iconUrl = await uploadService.processAndSave(
              req.file,
              'icons',
              'shop-icons'
            );
          } catch (uploadError) {
            throw new AppError('Failed to process shop icon', 500);
          }
        }

        const shop = await EconomyService.createShop(client, {
          ...req.body,
          icon_url: iconUrl
        });

        await auditLog(client, req.user, 'CREATE', {
          table: 'shop',
          id: shop.sys_id,
          new: shop
        });

        // Clear shops cache
        clearEconomyCache();

        return shop;
      });

      responseHandler.sendCreated(res, result, 'Shop created successfully');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to create shop', 500));
      }
    }
  }
);

router.get('/shops/:id',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    query: economyValidationSchemas.shopQuery
  }),
  createCacheMiddleware(
    'SHOP',
    (req) => CACHE_PATTERNS.SHOP(req.params.id, req.query),
    (req, data) => data && !data.error // Only cache successful responses
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const shop = await EconomyService.getShopDetails(client, req.params.id);
        if (!shop) {
          throw new AppError('Shop not found', 404, ERROR_TYPES.SHOP_NOT_FOUND);
        }
        return shop;
      });
      
      responseHandler.sendSuccess(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch shop details', 500));
      }
    }
  }
);

router.post('/shops/:id/items',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_ECONOMY),
  uploadService.handle('icons'),
  validateRequest({
    params: commonSchemas.uuid,
    body: economyValidationSchemas.shopItem
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if shop exists
        const shop = await EconomyService.getShopDetails(client, req.params.id);
        if (!shop) {
          throw new AppError('Shop not found', 404, ERROR_TYPES.SHOP_NOT_FOUND);
        }

        let iconUrl = null;
        if (req.file) {
          try {
            iconUrl = await uploadService.processAndSave(
              req.file,
              'icons',
              'shop-items'
            );
          } catch (uploadError) {
            throw new AppError('Failed to process item icon', 500);
          }
        }

        const item = await EconomyService.addShopItem(client, {
          ...req.body,
          shop_id: req.params.id,
          icon_url: iconUrl
        });

        await auditLog(client, req.user, 'CREATE', {
          table: 'shop_item',
          id: item.sys_id,
          new: item
        });

        // Clear shop cache
        clearEconomyCache();

        return item;
      });

      responseHandler.sendSuccess(res, result, 'Shop item added successfully');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to add shop item', 500));
      }
    }
  }
);

router.post('/items/:id/purchase',
  rateLimitPresets.ECONOMY.PURCHASE,
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: economyValidationSchemas.purchase
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if item exists
        const item = await EconomyService.getShopItem(client, req.params.id);
        if (!item) {
          throw new AppError('Item not found', 404, ERROR_TYPES.ITEM_NOT_FOUND);
        }

        // Check if item is available
        if (!item.is_available) {
          throw new AppError('Item is not available for purchase', 400, ERROR_TYPES.ITEM_NOT_AVAILABLE);
        }

        // Check if enough stock
        if (item.stock !== null && item.stock < req.body.quantity) {
          throw new AppError('Item is out of stock', 400, ERROR_TYPES.ITEM_OUT_OF_STOCK);
        }

        // Check if user has enough balance
        const balance = await EconomyService.getCurrencyBalance(client, req.user.sys_id);
        if (balance.balance < (item.price * req.body.quantity)) {
          throw new AppError('Insufficient balance', 400, ERROR_TYPES.INSUFFICIENT_BALANCE);
        }

        const purchase = await EconomyService.purchaseItem(
          client,
          req.params.id,
          req.user.sys_id,
          req.body.quantity
        );

        await auditLog(client, req.user, 'ITEM_PURCHASE', {
          table: 'shop_transaction',
          id: purchase.sys_id,
          new: purchase
        });

        return purchase;
      });

      responseHandler.sendSuccess(res, result, 'Item purchased successfully');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to purchase item', 500));
      }
    }
  }
);

// Inventory Routes
router.get('/inventory/:competitorId',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    query: economyValidationSchemas.inventoryQuery
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if competitor exists
        const competitor = await EconomyService.getCompetitor(client, req.params.competitorId);
        if (!competitor) {
          throw new AppError('Competitor not found', 404, ERROR_TYPES.COMPETITOR_NOT_FOUND);
        }

        return await EconomyService.getInventory(
          client,
          req.params.competitorId,
          req.query.include_used
        );
      });
      responseHandler.sendSuccess(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch inventory', 500));
      }
    }
  }
);

router.post('/inventory/:itemId/use',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: economyValidationSchemas.useItem
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Check if item exists in inventory
        const inventoryItem = await EconomyService.getInventoryItem(client, req.user.sys_id, req.params.itemId);
        if (!inventoryItem) {
          throw new AppError('Item not found in inventory', 404, ERROR_TYPES.ITEM_NOT_FOUND);
        }

        // Check if enough quantity
        if (inventoryItem.quantity < req.body.quantity) {
          throw new AppError('Insufficient quantity', 400, ERROR_TYPES.INSUFFICIENT_QUANTITY);
        }

        const usage = await EconomyService.useInventoryItem(
          client,
          req.user.sys_id,
          req.params.itemId,
          req.body.quantity
        );

        await auditLog(client, req.user, 'USE_ITEM', {
          table: 'item_usage',
          id: usage.usage.sys_id,
          new: usage
        });

        return usage;
      });

      responseHandler.sendSuccess(res, result, 'Item used successfully');
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to use item', 500));
      }
    }
  }
);

// Reward Routes
router.post('/rewards/daily',
  verifyToken,
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const reward = await EconomyService.claimDailyReward(client, req.user.sys_id);
        
        await auditLog(client, req.user, 'CLAIM_DAILY_REWARD', {
          table: 'daily_reward',
          id: reward.sys_id,
          new: reward
        });

        return reward;
      });

      responseHandler.sendSuccess(res, result, 'Daily reward claimed successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Trading System Routes
router.post('/trades',
  verifyToken,
  validateRequest({
    body: economyValidationSchemas.trade
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const trade = await EconomyService.createTrade(client, {
          ...req.body,
          initiator_id: req.user.sys_id
        });

        await auditLog(client, req.user, 'CREATE_TRADE', {
          table: 'trade',
          id: trade.sys_id,
          new: trade
        });

        return trade;
      });

      responseHandler.sendCreated(res, result, 'Trade created successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.get('/trades/:id', 
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid
  }),
  createCacheMiddleware(
    'ECONOMY',
    (req) => CACHE_PATTERNS.SHOP(req.params.id, 'trade')
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        return await EconomyService.getTradeDetails(client, req.params.id);
      });

      responseHandler.sendUpdated(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/trades/:id/respond',
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    body: economyValidationSchemas.tradeResponse
  }),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const trade = await EconomyService.respondToTrade(
          client,
          req.params.id,
          req.user.sys_id,
          req.body.accept
        );

        await auditLog(client, req.user, req.body.accept ? 'ACCEPT_TRADE' : 'REJECT_TRADE', {
          table: 'trade',
          id: trade.sys_id,
          old: { status: 'pending' },
          new: { status: req.body.accept ? 'accepted' : 'rejected' }
        });

        return trade;
      });

      responseHandler.sendUpdated(res, result);
    } catch (err) {
      next(err);
    }
  }
);

// Economy Metrics Routes
router.get('/metrics/:gameId',
  rateLimitPresets.STANDARD,
  verifyToken,
  validateRequest({
    params: commonSchemas.uuid,
    query: economyValidationSchemas.metricsQuery
  }),
  checkPermission(PERMISSIONS.VIEW_ECONOMY_STATS),
  createCacheMiddleware(
    'ECONOMY',
    (req) => CACHE_PATTERNS.SHOP(req.params.gameId, `metrics-${req.query.timeframe}-${req.query.granularity}`)
  ),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        await validatePermissions(client, req.user.sys_id, req.params.gameId, ['VIEW_GAME_STATS']);
        return await EconomyService.getEconomyMetrics(
          client,
          req.params.gameId,
          req.query.timeframe,
          req.query.granularity
        );
      });

      responseHandler.sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
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
  async (req, res, next) => {
    try {
      const rates = await withTransaction(async (client) => {
        return await EconomyService.getExchangeRates(
          client,
          req.query.base,
          req.query.targets
        );
      });
      responseHandler.sendSuccess(res, rates);
    } catch (error) {
      next(error);
    }
  }
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
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        const items = await EconomyService.bulkCreateItems(client, req.body);
        
        await auditLog(client, req.user, 'BULK_CREATE_ITEMS', {
          table: 'shop_items',
          ids: items.map(item => item.sys_id),
          new: items
        });

        return items;
      });
      
      responseHandler.sendSuccess(res, result, 'Bulk items created successfully');
    } catch (error) {
      next(error);
    }
  }
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
  async (req, res, next) => {
    try {
      const listings = await withTransaction(async (client) => {
        return await EconomyService.getMarketListings(
          client,
          req.query
        );
      });
      responseHandler.sendSuccess(res, listings);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 