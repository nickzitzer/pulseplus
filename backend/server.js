require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandlers.js');
const { logger, requestLoggerMiddleware } = require('./utils/logger');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const { serve: swaggerServe, setup: swaggerSetup } = require('./config/swagger');
const promBundle = require('express-prom-bundle');
const { register } = require('./utils/metrics');
const { securityMiddleware } = require('./config/security');
const { configureWebSocket } = require('./config/websocket');
const NotificationHandler = require('./websocket/notificationHandler');
const { measureMiddleware } = require('./utils/middlewareMetrics');
const { healthCheckMiddleware } = require('./middleware/healthCheck');
const { middlewareHealthCheck } = require('./middleware/middlewareHealth');
const { requirePasswordChange, checkAccountLockout } = require('./middleware/passwordPolicyMiddleware');

// Import centralized routes
const apiRoutes = require('./routes');
// Import API key rotation service
const apiKeyRotationService = require('./utils/apiKeyManager/rotationService');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.BACKEND_PORT || 3000;

// Configure WebSocket with rate limiting
configureWebSocket(io);

// Initialize notification handler with WebSocket server
const notificationHandler = new NotificationHandler(io);

// Health check endpoints (before any other middleware)
app.get('/health', healthCheckMiddleware);
app.get('/health/middleware', middlewareHealthCheck);

// Prometheus middleware
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { app: 'pulseplus-backend' },
  promClient: { collectDefaultMetrics: false }
});

app.use(metricsMiddleware);

// Expose custom metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Serve static files from the 'uploads' directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware setup
// 1. Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 2. Request logging middleware (must be early in the chain)
app.use(requestLoggerMiddleware);

// 3. Security middleware
// 1. Rate Limiting
app.use(measureMiddleware(securityMiddleware.rateLimit, 'global_rateLimit'));

// 2. Basic security headers
app.use(measureMiddleware(securityMiddleware.helmet, 'global_helmet'));
app.use(measureMiddleware(securityMiddleware.cors, 'global_cors'));

// 4. Check for account lockout before authentication
app.use(measureMiddleware(checkAccountLockout(), 'global_accountLockout'));

// 5. Authentication
app.use(measureMiddleware(passport.initialize(), 'global_passportInit'));
require('./config/passport')(passport);

// Authenticate all routes except /api/auth
const authenticateJwt = (req, res, next) => {
  if (req.path.startsWith('/api/auth')) {
    return next();
  }
  passport.authenticate('jwt', { session: false }, (err, result) => {
    if (err) {
      return next(err);
    }
    if (!result) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = result.user;
    if (result.newToken) {
      res.setHeader('X-New-Token', result.newToken);
    }
    next();
  })(req, res, next);
};
app.use(measureMiddleware(authenticateJwt, 'global_jwt'));

// 6. Check for password expiration after authentication
app.use(measureMiddleware(requirePasswordChange(), 'global_passwordExpiration'));

// 7. CSRF Protection (after authentication)
const csrfProtection = csrf({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' } });

// CSRF token endpoint - must be defined before the global CSRF middleware
app.get('/api/auth/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use(measureMiddleware((req, res, next) => {
  // Only bypass CSRF for specific auth endpoints that need to be exempt
  // Login, register, and password reset don't need CSRF as they're entry points
  const csrfExemptRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/password/reset',
    '/api/auth/password/forgot',
    '/api/auth/sso'
  ];
  
  // Check if the current path is in the exempt list or starts with an SSO path
  const isExempt = csrfExemptRoutes.some(route => 
    req.path === route || 
    (route === '/api/auth/sso' && req.path.startsWith('/api/auth/sso/'))
  );
  
  if (isExempt) {
    return next();
  }
  
  // Apply CSRF protection to all other routes, including state-changing auth routes
  csrfProtection(req, res, next);
}, 'global_csrf'));

// 8. Script rules middleware (business logic validation)
app.use(measureMiddleware((req, res, next) => {
  if (!req.path.startsWith('/api/auth')) {
    applyScriptRules(req, res, next);
  } else {
    next();
  }
}, 'global_scriptRules'));

// Configure multer for file uploads
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Serve Swagger documentation
app.use('/api-docs', swaggerServe, swaggerSetup);

// Use centralized routes
app.use('/api', apiRoutes);

// Error handling
app.use(measureMiddleware(notFoundHandler, 'global_notFound'));
app.use(measureMiddleware(errorHandler, 'global_errorHandler'));

server.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`WebSocket server initialized with rate limiting`);
  logger.info(`Password policy and brute force protection enabled`);
  
  // Start API key rotation service in production/staging
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    apiKeyRotationService.start();
    logger.info('API key rotation service started');
  }
});

module.exports = { app, server, io };