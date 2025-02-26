const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkResourcePermission } = require('../utils/permissionChecker');

// Import route modules
const userRoutes = require('./user-routes');
const gameRoutes = require('./game-routes');
const socialRoutes = require('./social-routes');
const economyRoutes = require('./economy-routes');
const seasonRoutes = require('./season-routes');
const departmentRoutes = require('./department-routes');
const adminRoutes = require('./admin-routes');

// Apply authentication and permission checking to all routes
// Public routes like login and register should be handled within their respective route files
router.use('/users', verifyToken, checkResourcePermission('users'), userRoutes);
router.use('/games', verifyToken, checkResourcePermission('games'), gameRoutes);
router.use('/social', verifyToken, checkResourcePermission('social'), socialRoutes);
router.use('/economy', verifyToken, checkResourcePermission('economy'), economyRoutes);
router.use('/seasons', verifyToken, checkResourcePermission('seasons'), seasonRoutes);
router.use('/departments', verifyToken, checkResourcePermission('departments'), departmentRoutes);
router.use('/admin', verifyToken, checkResourcePermission('admin'), adminRoutes);

module.exports = router;
