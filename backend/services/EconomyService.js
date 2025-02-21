const AppError = require('../utils/appError');

/**
 * @class EconomyService
 * @description Service class handling all in-game economy operations including currency management,
 * inventory systems, shop transactions, trading, and economic analytics
 */
class EconomyService {
  /**
   * @method getBalance
   * @description Retrieves the current currency balance and transaction history for a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Object} Balance details including total earned/spent and last transaction
   * @throws {AppError} If currency balance is not found
   */
  static async getBalance(client, competitorId) {
    const { rows } = await client.query(`
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
      throw new AppError('Currency balance not found', 404);
    }

    return rows[0];
  }

  /**
   * @method transferCurrency
   * @description Transfers currency between two competitors with transaction logging
   * @param {Object} client - Database client
   * @param {string} fromCompetitorId - Sender's competitor ID
   * @param {string} toCompetitorId - Recipient's competitor ID
   * @param {number} amount - Amount to transfer
   * @param {string} reason - Reason for the transfer
   * @returns {Object} Transaction details
   * @throws {AppError} If sender has insufficient funds or recipient not found
   */
  static async transferCurrency(client, fromCompetitorId, toCompetitorId, amount, reason) {
    // Get sender's balance
    const { rows: senderBalance } = await client.query(
      'SELECT * FROM currency_balance WHERE competitor_id = $1 FOR UPDATE',
      [fromCompetitorId]
    );

    if (senderBalance.length === 0 || senderBalance[0].balance < amount) {
      throw new AppError('Insufficient funds', 400);
    }

    // Get recipient's balance
    const { rows: recipientBalance } = await client.query(
      'SELECT * FROM currency_balance WHERE competitor_id = $1 FOR UPDATE',
      [toCompetitorId]
    );

    if (recipientBalance.length === 0) {
      throw new AppError('Recipient not found', 404);
    }

    // Perform transfer
    await client.query(
      'UPDATE currency_balance SET balance = balance - $1 WHERE competitor_id = $2',
      [amount, fromCompetitorId]
    );

    await client.query(
      'UPDATE currency_balance SET balance = balance + $1 WHERE competitor_id = $2',
      [amount, toCompetitorId]
    );

    // Record transaction
    const { rows: transaction } = await client.query(
      `INSERT INTO currency_transaction 
      (from_competitor_id, to_competitor_id, amount, reason, status, type)
      VALUES ($1, $2, $3, $4, 'COMPLETED', 'TRANSFER')
      RETURNING *`,
      [fromCompetitorId, toCompetitorId, amount, reason]
    );

    return transaction[0];
  }

  /**
   * @method getInventory
   * @description Retrieves a competitor's inventory with detailed item information
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Array<Object>} List of inventory items with details and purchase history
   */
  static async getInventory(client, competitorId) {
    const { rows } = await client.query(`
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
  }

  /**
   * @method useItem
   * @description Uses an item from a competitor's inventory
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} itemId - Item's unique identifier
   * @param {number} [quantity=1] - Quantity of items to use
   * @returns {Object} Updated inventory and usage details
   * @throws {AppError} If item not found or insufficient quantity
   */
  static async useItem(client, competitorId, itemId, quantity = 1) {
    // Get inventory item
    const { rows: inventory } = await client.query(
      'SELECT * FROM inventory WHERE competitor_id = $1 AND item_id = $2 FOR UPDATE',
      [competitorId, itemId]
    );

    if (inventory.length === 0 || inventory[0].quantity < quantity) {
      throw new AppError('Item not found in inventory or insufficient quantity', 400);
    }

    // Update inventory
    const { rows: updated } = await client.query(
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
    const { rows: usage } = await client.query(
      `INSERT INTO item_usage 
      (competitor_id, item_id, quantity, attributes)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [competitorId, itemId, quantity, inventory[0].attributes]
    );

    return {
      inventory: updated[0],
      usage: usage[0]
    };
  }

  /**
   * @method purchaseItem
   * @description Purchases an item from the shop and adds it to inventory
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {string} itemId - Item's unique identifier
   * @param {number} [quantity=1] - Quantity of items to purchase
   * @returns {Object} Updated inventory and transaction details
   * @throws {AppError} If item not available or insufficient funds
   */
  static async purchaseItem(client, competitorId, itemId, quantity = 1) {
    // Get item details
    const { rows: item } = await client.query(
      `SELECT * FROM shop_item 
      WHERE sys_id = $1 AND is_available = true`,
      [itemId]
    );

    if (item.length === 0) {
      throw new AppError('Item not available', 404);
    }

    // Get competitor balance
    const { rows: balance } = await client.query(
      'SELECT * FROM currency_balance WHERE competitor_id = $1 FOR UPDATE',
      [competitorId]
    );

    if (balance.length === 0 || balance[0].balance < item[0].price * quantity) {
      throw new AppError('Insufficient funds', 400);
    }

    // Deduct balance
    await client.query(
      'UPDATE currency_balance SET balance = balance - $1 WHERE competitor_id = $2',
      [item[0].price * quantity, competitorId]
    );

    // Add to inventory
    const { rows: inventory } = await client.query(
      `INSERT INTO inventory 
      (competitor_id, item_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (competitor_id, item_id) 
      DO UPDATE SET 
        quantity = inventory.quantity + EXCLUDED.quantity,
        last_acquired_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [competitorId, itemId, quantity]
    );

    // Record transaction
    const { rows: transaction } = await client.query(
      `INSERT INTO shop_transaction 
      (competitor_id, item_id, quantity, price_per_unit)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [competitorId, itemId, quantity, item[0].price]
    );

    return {
      inventory: inventory[0],
      transaction: transaction[0]
    };
  }

  /**
   * @method claimDailyReward
   * @description Claims the daily reward for a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @returns {Object} Reward details
   */
  static async claimDailyReward(client, competitorId) {
    const { rows: reward } = await client.query(
      `INSERT INTO daily_reward 
      (competitor_id, reward_data)
      VALUES ($1, $2)
      RETURNING *`,
      [competitorId, { type: 'DAILY', amount: 100 }]
    );

    // Add to balance
    await client.query(
      'UPDATE currency_balance SET balance = balance + $1 WHERE competitor_id = $2',
      [100, competitorId]
    );

    return reward[0];
  }

  /**
   * @method claimLevelUpReward
   * @description Claims the level-up reward for a competitor
   * @param {Object} client - Database client
   * @param {string} competitorId - Competitor's unique identifier
   * @param {number} level - New level achieved
   * @returns {Object} Reward details
   */
  static async claimLevelUpReward(client, competitorId, level) {
    const { rows: reward } = await client.query(
      `INSERT INTO level_reward 
      (competitor_id, level, reward_data)
      VALUES ($1, $2, $3)
      RETURNING *`,
      [competitorId, level, { type: 'LEVEL_UP', amount: level * 50 }]
    );

    // Add to balance
    await client.query(
      'UPDATE currency_balance SET balance = balance + $1 WHERE competitor_id = $2',
      [level * 50, competitorId]
    );

    return reward[0];
  }

  /**
   * @method createTradeOffer
   * @description Creates a new trade offer between two competitors
   * @param {Object} client - Database client
   * @param {string} fromId - Initiating competitor's ID
   * @param {string} toId - Target competitor's ID
   * @param {Array<Object>} items - Items to trade with quantities
   * @returns {Object} Created trade offer details
   * @throws {AppError} If items not owned or insufficient quantities
   */
  static async createTradeOffer(client, fromId, toId, items) {
    // Verify items ownership
    const { rows: ownedItems } = await client.query(
      `SELECT item_id, quantity 
      FROM inventory 
      WHERE competitor_id = $1 AND item_id = ANY($2)`,
      [fromId, items.map(i => i.item_id)]
    );

    // Verify quantities
    for (const item of items) {
      const owned = ownedItems.find(i => i.item_id === item.item_id);
      if (!owned || owned.quantity < item.quantity) {
        throw new AppError(`Insufficient quantity for item: ${item.item_id}`, 400);
      }
    }

    // Create trade offer
    const { rows: [trade] } = await client.query(
      `INSERT INTO trade 
      (from_competitor_id, to_competitor_id, status, expires_at)
      VALUES ($1, $2, 'PENDING', CURRENT_TIMESTAMP + interval '24 hours')
      RETURNING *`,
      [fromId, toId]
    );

    // Add trade items
    await client.query(
      `INSERT INTO trade_item 
      (trade_id, item_id, quantity, from_competitor)
      SELECT 
        $1,
        i.item_id,
        i.quantity,
        true
      FROM jsonb_to_recordset($2) AS i(item_id uuid, quantity integer)`,
      [trade.sys_id, JSON.stringify(items)]
    );

    return this.getTradeDetails(client, trade.sys_id);
  }

  /**
   * @method getTradeDetails
   * @description Retrieves detailed information about a trade
   * @param {Object} client - Database client
   * @param {string} tradeId - Trade's unique identifier
   * @returns {Object} Trade details including items and participants
   * @throws {AppError} If trade not found
   */
  static async getTradeDetails(client, tradeId) {
    const { rows: [trade] } = await client.query(`
      SELECT 
        t.*,
        json_build_object(
          'id', fc.sys_id,
          'name', fu.user_name,
          'avatar', fu.avatar_url
        ) as from_competitor,
        json_build_object(
          'id', tc.sys_id,
          'name', tu.user_name,
          'avatar', tu.avatar_url
        ) as to_competitor,
        (
          SELECT json_agg(json_build_object(
            'item_id', ti.item_id,
            'quantity', ti.quantity,
            'from_competitor', ti.from_competitor,
            'item_details', json_build_object(
              'name', i.name,
              'description', i.description,
              'rarity', i.rarity
            )
          ))
          FROM trade_item ti
          JOIN shop_item i ON ti.item_id = i.sys_id
          WHERE ti.trade_id = t.sys_id
        ) as items
      FROM trade t
      JOIN competitor fc ON t.from_competitor_id = fc.sys_id
      JOIN competitor tc ON t.to_competitor_id = tc.sys_id
      JOIN sys_user fu ON fc.user_id = fu.sys_id
      JOIN sys_user tu ON tc.user_id = tu.sys_id
      WHERE t.sys_id = $1`,
      [tradeId]
    );

    if (!trade) {
      throw new AppError('Trade not found', 404);
    }

    return trade;
  }

  /**
   * @method respondToTrade
   * @description Handles accepting or rejecting a trade offer
   * @param {Object} client - Database client
   * @param {string} tradeId - Trade's unique identifier
   * @param {string} competitorId - Responding competitor's ID
   * @param {boolean} accept - Whether to accept the trade
   * @returns {Object} Updated trade status
   * @throws {AppError} If trade not found or already processed
   */
  static async respondToTrade(client, tradeId, competitorId, accept) {
    const { rows: [trade] } = await client.query(
      `SELECT * FROM trade WHERE sys_id = $1 AND to_competitor_id = $2`,
      [tradeId, competitorId]
    );

    if (!trade || trade.status !== 'PENDING') {
      throw new AppError('Invalid trade', 400);
    }

    if (accept) {
      await this.executeTrade(client, trade);
    }

    await client.query(
      `UPDATE trade 
      SET status = $1, completed_at = CURRENT_TIMESTAMP
      WHERE sys_id = $2`,
      [accept ? 'COMPLETED' : 'REJECTED', tradeId]
    );

    return this.getTradeDetails(client, tradeId);
  }

  /**
   * @method executeTrade
   * @description Executes an accepted trade by transferring items
   * @param {Object} client - Database client
   * @param {Object} trade - Trade details to execute
   * @returns {Object} Execution results
   * @throws {AppError} If trade execution fails
   * @private
   */
  static async executeTrade(client, trade) {
    const { rows: items } = await client.query(
      'SELECT * FROM trade_item WHERE trade_id = $1',
      [trade.sys_id]
    );

    // Update inventories
    for (const item of items) {
      const fromId = item.from_competitor ? trade.from_competitor_id : trade.to_competitor_id;
      const toId = item.from_competitor ? trade.to_competitor_id : trade.from_competitor_id;

      // Remove from sender
      await client.query(
        `UPDATE inventory 
        SET quantity = quantity - $1
        WHERE competitor_id = $2 AND item_id = $3`,
        [item.quantity, fromId, item.item_id]
      );

      // Add to receiver
      await client.query(
        `INSERT INTO inventory 
        (competitor_id, item_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (competitor_id, item_id) 
        DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
        [toId, item.item_id, item.quantity]
      );
    }
  }

  /**
   * @method createShopItem
   * @description Creates a new item in the shop
   * @param {Object} client - Database client
   * @param {Object} itemData - Item details including name, price, and attributes
   * @returns {Object} Created shop item
   * @throws {AppError} If item data is invalid
   */
  static async createShopItem(client, itemData) {
    const { rows: [item] } = await client.query(
      `INSERT INTO shop_item 
      (name, description, price, currency_type, rarity, 
       max_quantity, available_from, available_until, requirements)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        itemData.name,
        itemData.description,
        itemData.price,
        itemData.currency_type,
        itemData.rarity,
        itemData.max_quantity,
        itemData.available_from,
        itemData.available_until,
        itemData.requirements
      ]
    );

    return item;
  }

  /**
   * @method getShopInventory
   * @description Retrieves available items in a shop with competitor-specific details
   * @param {Object} client - Database client
   * @param {string} shopId - Shop's unique identifier
   * @param {string} competitorId - Competitor viewing the shop
   * @returns {Array<Object>} Available shop items with purchase history
   */
  static async getShopInventory(client, shopId, competitorId) {
    const { rows } = await client.query(`
      SELECT 
        si.*,
        i.quantity as owned_quantity,
        json_build_object(
          'total_sold', COUNT(DISTINCT st.sys_id),
          'last_purchased', MAX(st.created_at),
          'available_quantity', 
            CASE 
              WHEN si.max_quantity IS NULL THEN NULL
              ELSE si.max_quantity - COUNT(DISTINCT st.sys_id)
            END
        ) as stats
      FROM shop_item si
      LEFT JOIN inventory i ON si.sys_id = i.item_id 
        AND i.competitor_id = $1
      LEFT JOIN shop_transaction st ON si.sys_id = st.item_id
      WHERE si.shop_id = $2
        AND (si.available_until IS NULL OR si.available_until > CURRENT_TIMESTAMP)
      GROUP BY si.sys_id, i.quantity
      ORDER BY si.price`,
      [competitorId, shopId]
    );

    return rows;
  }

  /**
   * @method trackEconomyStats
   * @description Records economic statistics for a game
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @returns {Object} Recorded statistics
   */
  static async trackEconomyStats(client, gameId) {
    const { rows: [stats] } = await client.query(`
      INSERT INTO maintenance.index_stats_history 
      (game_id, timestamp, stats)
      SELECT 
        $1,
        CURRENT_TIMESTAMP,
        json_build_object(
          'currency_circulation', (
            SELECT COALESCE(SUM(balance), 0)
            FROM currency_balance
            WHERE game_id = $1
          ),
          'active_trades', (
            SELECT COUNT(*)
            FROM trade t
            JOIN competitor c ON t.from_competitor_id = c.sys_id
            WHERE c.game_id = $1 AND t.status = 'PENDING'
          ),
          'items_traded', (
            SELECT COUNT(*)
            FROM trade_item ti
            JOIN trade t ON ti.trade_id = t.sys_id
            JOIN competitor c ON t.from_competitor_id = c.sys_id
            WHERE c.game_id = $1
            AND t.created_at > CURRENT_TIMESTAMP - interval '24 hours'
          ),
          'shop_transactions', (
            SELECT COUNT(*)
            FROM shop_transaction st
            JOIN competitor c ON st.competitor_id = c.sys_id
            WHERE c.game_id = $1
            AND st.created_at > CURRENT_TIMESTAMP - interval '24 hours'
          )
        )
      RETURNING *`,
      [gameId]
    );

    return stats;
  }

  /**
   * @method getEconomyMetrics
   * @description Retrieves economic metrics for a game over a specified timeframe
   * @param {Object} client - Database client
   * @param {string} gameId - Game's unique identifier
   * @param {string} [timeframe='7 days'] - Time period for metrics
   * @returns {Object} Economic metrics and trends
   */
  static async getEconomyMetrics(client, gameId, timeframe = '7 days') {
    const { rows } = await client.query(`
      SELECT 
        date_trunc('day', timestamp) as date,
        stats
      FROM maintenance.index_stats_history
      WHERE game_id = $1
        AND timestamp > CURRENT_TIMESTAMP - interval $2
      ORDER BY timestamp DESC`,
      [gameId, timeframe]
    );

    return rows;
  }
}

module.exports = EconomyService; 