/**
 * @module notificationService
 * @description Service for managing user notifications and Redis pub/sub
 * @requires redis
 */

const Redis = require('redis');
const { logger } = require('../utils/logger');
const ConfigFactory = require('../utils/configFactory');

/**
 * @typedef {Object} Notification
 * @property {string} id - Notification unique identifier
 * @property {string} type - Type of notification
 * @property {string} message - Notification message
 * @property {Object} data - Additional notification data
 * @property {Date} timestamp - When the notification was created
 */

class NotificationService {
  /**
   * @static
   * @async
   * @function subscribeToNotifications
   * @description Subscribe to Redis notifications for a specific user
   * @param {string} userId - User ID to subscribe for
   * @param {Object} socket - Socket.IO socket instance
   * @returns {Object} Redis subscriber client
   */
  static async subscribeToNotifications(userId, socket) {
    try {
      // Create Redis client for subscription
      const redisConfig = ConfigFactory.createRedisConfig();
      const subscriber = Redis.createClient({
        url: `redis://${redisConfig.host}:${redisConfig.port}`,
        password: redisConfig.password
      });

      // Handle connection errors
      subscriber.on('error', (err) => {
        logger.error(`Redis subscription error: ${err.message}`);
      });

      // Connect to Redis
      await subscriber.connect();

      // Subscribe to user-specific channel
      await subscriber.subscribe(`user:${userId}`, (message) => {
        try {
          const notification = JSON.parse(message);
          socket.emit('notification', notification);
        } catch (error) {
          logger.error(`Error processing notification: ${error.message}`);
        }
      });

      // Join user-specific room for direct messaging
      socket.join(`user:${userId}`);

      logger.info(`User ${userId} subscribed to notifications`);
      return subscriber;
    } catch (error) {
      logger.error(`Failed to subscribe to notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * @static
   * @async
   * @function createNotification
   * @description Create and store a new notification
   * @param {string} userId - Target user ID
   * @param {string} type - Notification type
   * @param {string} message - Notification message
   * @param {Object} data - Additional notification data
   * @returns {Notification} Created notification
   */
  static async createNotification(userId, type, message, data = {}) {
    try {
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        data,
        timestamp: new Date(),
        userId
      };

      // In a real implementation, you would store this in a database
      // For now, we'll just return it
      
      return notification;
    } catch (error) {
      logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * @static
   * @async
   * @function publishNotification
   * @description Publish a notification to Redis
   * @param {string} userId - Target user ID
   * @param {Notification} notification - Notification to publish
   * @returns {boolean} Success status
   */
  static async publishNotification(userId, notification) {
    try {
      // Create Redis client for publishing
      const redisConfig = ConfigFactory.createRedisConfig();
      const publisher = Redis.createClient({
        url: `redis://${redisConfig.host}:${redisConfig.port}`,
        password: redisConfig.password
      });

      // Connect to Redis
      await publisher.connect();

      // Publish notification to user-specific channel
      await publisher.publish(`user:${userId}`, JSON.stringify(notification));
      
      // Disconnect after publishing
      await publisher.disconnect();
      
      return true;
    } catch (error) {
      logger.error(`Failed to publish notification: ${error.message}`);
      return false;
    }
  }
}

module.exports = NotificationService; 