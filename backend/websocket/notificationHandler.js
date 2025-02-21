/**
 * @module notificationHandler
 * @description WebSocket-based real-time notification system with Redis pub/sub integration
 * @requires ../services/notificationService
 * @requires ../middleware/auth
 */

const NotificationService = require('../services/notificationService');
const { verifyToken } = require('../middleware/auth');

/**
 * @typedef {Object} Notification
 * @property {string} id - Notification unique identifier
 * @property {string} type - Type of notification
 * @property {string} message - Notification message
 * @property {Object} data - Additional notification data
 * @property {Date} timestamp - When the notification was created
 */

/**
 * @class NotificationHandler
 * @description Manages WebSocket connections and real-time notifications
 */
class NotificationHandler {
  /**
   * @constructor
   * @param {Object} io - Socket.IO server instance
   */
  constructor(io) {
    /**
     * @private
     * @type {Object}
     * @description Socket.IO server instance
     */
    this.io = io;

    /**
     * @private
     * @type {Map<string, Object>}
     * @description Map of socket IDs to Redis subscribers
     */
    this.subscribers = new Map();
    
    this.setupSocketHandlers();
  }

  /**
   * @private
   * @function setupSocketHandlers
   * @description Sets up WebSocket connection handlers and authentication middleware
   */
  setupSocketHandlers() {
    this.io.of('/notifications').use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const user = await verifyToken(token);
        if (!user) {
          return next(new Error('Invalid token'));
        }

        socket.user = user;
        next();
      } catch (error) {
        next(error);
      }
    });

    this.io.of('/notifications').on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * @private
   * @async
   * @function handleConnection
   * @description Handles new WebSocket connections and sets up event listeners
   * @param {Object} socket - Socket.IO socket instance
   */
  async handleConnection(socket) {
    const userId = socket.user.sys_id;

    // Subscribe to Redis notifications
    const subscriber = await NotificationService.subscribeToNotifications(userId, socket);
    this.subscribers.set(socket.id, subscriber);

    // Handle disconnection
    socket.on('disconnect', () => {
      const subscriber = this.subscribers.get(socket.id);
      if (subscriber) {
        subscriber.unsubscribe();
        subscriber.quit();
        this.subscribers.delete(socket.id);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket Error for user ${userId}:`, error);
      socket.disconnect();
    });
  }

  /**
   * @async
   * @function broadcastToUser
   * @description Broadcasts a notification to a specific user
   * @param {string} userId - Target user's ID
   * @param {Notification} notification - Notification to broadcast
   * @returns {Promise<void>}
   * 
   * @example
   * await notificationHandler.broadcastToUser('user123', {
   *   id: 'notif123',
   *   type: 'ACHIEVEMENT',
   *   message: 'You earned a new badge!',
   *   data: { badgeId: 'badge123' },
   *   timestamp: new Date()
   * });
   */
  async broadcastToUser(userId, notification) {
    this.io.of('/notifications').to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * @async
   * @function broadcastToAll
   * @description Broadcasts a notification to all connected users
   * @param {Notification} notification - Notification to broadcast
   * @returns {Promise<void>}
   * 
   * @example
   * await notificationHandler.broadcastToAll({
   *   id: 'notif123',
   *   type: 'SYSTEM',
   *   message: 'Server maintenance in 10 minutes',
   *   data: { duration: '30m' },
   *   timestamp: new Date()
   * });
   */
  async broadcastToAll(notification) {
    this.io.of('/notifications').emit('notification', notification);
  }

  /**
   * @async
   * @function broadcastToGame
   * @description Broadcasts a notification to all users in a specific game
   * @param {string} gameId - Target game's ID
   * @param {Notification} notification - Notification to broadcast
   * @returns {Promise<void>}
   * 
   * @example
   * await notificationHandler.broadcastToGame('game123', {
   *   id: 'notif123',
   *   type: 'GAME_EVENT',
   *   message: 'New high score achieved!',
   *   data: { score: 1000 },
   *   timestamp: new Date()
   * });
   */
  async broadcastToGame(gameId, notification) {
    this.io.of('/notifications').to(`game:${gameId}`).emit('notification', notification);
  }

  /**
   * @async
   * @function broadcastToTeam
   * @description Broadcasts a notification to all users in a specific team
   * @param {string} teamId - Target team's ID
   * @param {Notification} notification - Notification to broadcast
   * @returns {Promise<void>}
   * 
   * @example
   * await notificationHandler.broadcastToTeam('team123', {
   *   id: 'notif123',
   *   type: 'TEAM_EVENT',
   *   message: 'Team challenge completed!',
   *   data: { challengeId: 'challenge123' },
   *   timestamp: new Date()
   * });
   */
  async broadcastToTeam(teamId, notification) {
    this.io.of('/notifications').to(`team:${teamId}`).emit('notification', notification);
  }
}

module.exports = NotificationHandler; 