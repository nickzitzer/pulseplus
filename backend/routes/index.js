const express = require('express');
const router = express.Router();

// Import route modules
const userRoutes = require('./user-routes');
const gameRoutes = require('./game-routes');
const socialRoutes = require('./social-routes');
const economyRoutes = require('./economy-routes');
const seasonRoutes = require('./season-routes');
const departmentRoutes = require('./department-routes');
const adminRoutes = require('./admin-routes');

// Apply routes directly
router.use('/users', userRoutes);
router.use('/games', gameRoutes);
router.use('/social', socialRoutes);
router.use('/economy', economyRoutes);
router.use('/seasons', seasonRoutes);
router.use('/departments', departmentRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
