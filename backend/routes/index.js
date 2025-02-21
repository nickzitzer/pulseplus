const express = require('express');
const router = express.Router();
const { responseHandler } = require('../utils/responseHandler');
const userRoutes = require('./user-routes');
const gameRoutes = require('./game-routes');
const socialRoutes = require('./social-routes');
const economyRoutes = require('./economy-routes');
const seasonRoutes = require('./season-routes');

// Core Service Routes
router.use('/users', userRoutes);
router.use('/games', gameRoutes);
router.use('/social', socialRoutes);
router.use('/economy', economyRoutes);
router.use('/seasons', seasonRoutes);

// 404 handler
router.use((req, res) => {
  responseHandler.sendError(res, {
    statusCode: 404,
    name: 'NotFoundError',
    message: `Cannot ${req.method} ${req.url}`,
    isOperational: true
  });
});

// Global error handler
router.use((err, req, res, next) => {
  responseHandler.sendError(res, err);
});

// Export the router
module.exports = router;
