const AppError = require('../utils/appError');
const { createCrudService, withTransaction } = require('../utils/serviceFactory');
const { logger } = require('../utils/logger');
const { clearResourceCache } = require('../utils/cacheConfig');
const { cacheManager, CACHE_NAMES } = require('../utils/cacheService');
const { pool } = require('../database/connection');

/**
 * @module EconomyService
 * @description Service handling all in-game economy operations including currency management,
 * inventory systems, shop transactions, trading, and economic analytics
 * @requires ../utils/serviceFactory
 * @requires ../utils/appError
 * @requires ../utils/logger
 * @requires ../utils/cacheConfig
 * @requires ../utils/cacheService
 * @requires ../database/connection
 */

// Create base CRUD service
const baseCrudService = createCrudService('currency_balance', {
  idField: 'sys_id',
  searchFields: ['competitor_id', 'game_id'],
  allowedFields: ['competitor_id', 'game_id', 'balance'],
  hooks: {
    afterCreate: async (balance, currentUser, client) => {
      // Clear cache
      clearResourceCache(cacheManager, CACHE_NAMES.ECONOMY, 'CURRENCY', 'CREATE');
      
      // Log creation
      logger.info(`Currency balance created for competitor: ${balance.competitor_id}`, {
        competitorId: balance.competitor_id,
        createdBy: currentUser?.id
      });
    },
    afterUpdate: async (balance, oldData, currentUser) => {
      // Clear cache
      clearResourceCache(cacheManager, CACHE_NAMES.ECONOMY, 'CURRENCY', 'UPDATE', balance.sys_id);
      
      // Log update
      logger.info(`Currency balance updated for competitor: ${balance.competitor_id}`, {
        competitorId: balance.competitor_id,
        updatedBy: currentUser?.id
      });
    }
  }
});

/**
 * @function getBalance
 * @description Retrieves the current currency balance and transaction history for a competitor
 * @param {string} competitorId - Competitor's unique identifier
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Balance details including total earned/spent and last transaction
 * @throws {AppError} If currency balance is not found
 */
const getBalance = async (competitorId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    const { rows } = await dbClient.query(`
      SELECT 
        cb.*,
        g.currency_name,
        g.currency_conversion,
        json_build_object(
          'total_earned', COALESCE(SUM(CASE WHEN ch.type = 'EARNED' THEN ch.amount END), 0),
          'total_spent', COALESCE(SUM(CASE WHEN ch.type = 'SPENT' THEN ch.amount END), 0),
          'last_transaction', (
            SELECT json_build_object(
              'amount', amount,
              'type', type,
              'source', source,
              'occurred_at', occurred_at
            )
            FROM currency_history
            WHERE competitor_id = cb.competitor_id
            ORDER BY occurred_at DESC
            LIMIT 1
          )
        ) as stats
      FROM currency_balance cb
      JOIN competitor c ON cb.competitor_id = c.sys_id
      JOIN game g ON c.game_id = g.sys_id
      LEFT JOIN currency_history ch ON cb.competitor_id = ch.competitor_id
      WHERE cb.competitor_id = $1
      GROUP BY cb.sys_id, cb.competitor_id, cb.balance, g.currency_name, g.currency_conversion`,
      [competitorId]
    );

    if (rows.length === 0) {
      throw new AppError('Currency balance not found', 404, 'RESOURCE_NOT_FOUND');
    }

    return rows[0];
  }, client);
};

/**
 * @function transferCurrency
 * @description Transfers currency between two competitors with transaction logging
 * @param {string} fromCompetitorId - Sender's competitor ID
 * @param {string} toCompetitorId - Recipient's competitor ID
 * @param {number} amount - Amount to transfer
 * @param {string} reason - Reason for the transfer
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Transaction details
 * @throws {AppError} If sender has insufficient funds or recipient not found
 */
const transferCurrency = async (fromCompetitorId, toCompetitorId, amount, reason, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Get sender's balance
    const { rows: senderBalance } = await dbClient.query(
      'SELECT * FROM currency_balance WHERE competitor_id = $1 FOR UPDATE',
      [fromCompetitorId]
    );

    if (senderBalance.length === 0 || senderBalance[0].balance < amount) {
      throw new AppError('Insufficient funds', 400, 'INSUFFICIENT_FUNDS');
    }

    // Get recipient's balance
    const { rows: recipientBalance } = await dbClient.query(
      'SELECT * FROM currency_balance WHERE competitor_id = $1 FOR UPDATE',
      [toCompetitorId]
    );

    if (recipientBalance.length === 0) {
      throw new AppError('Recipient not found', 404, 'RECIPIENT_NOT_FOUND');
    }

    // Perform transfer
    await dbClient.query(
      'UPDATE currency_balance SET balance = balance - $1 WHERE competitor_id = $2',
      [amount, fromCompetitorId]
    );

    await dbClient.query(
      'UPDATE currency_balance SET balance = balance + $1 WHERE competitor_id = $2',
      [amount, toCompetitorId]
    );

    // Record transaction
    const { rows: transaction } = await dbClient.query(
      `INSERT INTO currency_transaction 
      (from_competitor_id, to_competitor_id, amount, reason, status, type)
      VALUES ($1, $2, $3, $4, 'COMPLETED', 'TRANSFER')
      RETURNING *`,
      [fromCompetitorId, toCompetitorId, amount, reason]
    );

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.ECONOMY, 'CURRENCY', 'UPDATE');
    
    // Log transaction
    logger.info(`Currency transfer completed: ${fromCompetitorId} -> ${toCompetitorId}`, {
      fromCompetitorId,
      toCompetitorId,
      amount,
      reason
    });

    return transaction[0];
  }, client);
};

/**
 * @function getInventory
 * @description Retrieves a competitor's inventory with detailed item information
 * @param {string} competitorId - Competitor's unique identifier
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Array<Object>>} List of inventory items with details and purchase history
 */
const getInventory = async (competitorId, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    const { rows } = await dbClient.query(`
      SELECT 
        i.*,
        si.name as item_name,
        si.description,
        si.icon_url,
        si.rarity,
        json_build_object(
          'purchase_date', st.occurred_at,
          'price_paid', st.price_per_unit
        ) as purchase_info
      FROM inventory i
      JOIN shop_item si ON i.item_id = si.sys_id
      JOIN shop s ON si.shop_id = s.sys_id
      LEFT JOIN shop_transaction st ON i.competitor_id = st.competitor_id 
        AND i.item_id = st.item_id
      WHERE i.competitor_id = $1
      ORDER BY st.occurred_at DESC`,
      [competitorId]
    );

    return rows;
  }, client);
};

/**
 * @function useItem
 * @description Uses an item from a competitor's inventory
 * @param {string} competitorId - Competitor's unique identifier
 * @param {string} itemId - Item's unique identifier
 * @param {number} [quantity=1] - Quantity of items to use
 * @param {Object} [client=null] - Optional database client for transaction
 * @returns {Promise<Object>} Updated inventory and usage details
 * @throws {AppError} If item not found or insufficient quantity
 */
const useItem = async (competitorId, itemId, quantity = 1, client = null) => {
  return withTransaction(async (txClient) => {
    const dbClient = client || txClient;
    
    // Get inventory item
    const { rows: inventory } = await dbClient.query(
      'SELECT * FROM inventory WHERE competitor_id = $1 AND item_id = $2 FOR UPDATE',
      [competitorId, itemId]
    );

    if (inventory.length === 0 || inventory[0].quantity < quantity) {
      throw new AppError('Item not found in inventory or insufficient quantity', 400, 'INSUFFICIENT_QUANTITY');
    }

    // Update inventory
    const { rows: updated } = await dbClient.query(
      `UPDATE inventory 
      SET 
        quantity = quantity - $1,
        last_used_at = CURRENT_TIMESTAMP,
        use_count = use_count + 1
      WHERE competitor_id = $2 AND item_id = $3
      RETURNING *`,
      [quantity, competitorId, itemId]
    );

    // Record usage
    const { rows: usage } = await dbClient.query(
      `INSERT INTO item_usage 
      (competitor_id, item_id, quantity, attributes)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [competitorId, itemId, quantity, inventory[0].attributes]
    );

    // Clear cache
    clearResourceCache(cacheManager, CACHE_NAMES.ECONOMY, 'INVENTORY', 'UPDATE');
    
    // Log item usage
    logger.info(`Item used: ${itemId} by competitor ${competitorId}`, {
      competitorId,
      itemId,
      quantity
    });

    return {
      inventory: updated[0],
      usage: usage[0]
    };
  }, client);
};

// Export service with all methods
const EconomyService = {
  // Base CRUD operations
  ...baseCrudService,
  
  // Custom methods
  getBalance,
  transferCurrency,
  getInventory,
  useItem
};

module.exports = EconomyService; 