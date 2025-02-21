require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandlers.js');
const logger = require('./utils/logger');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const { serve: swaggerServe, setup: swaggerSetup } = require('./config/swagger');

// Import centralized routes
const apiRoutes = require('./routes');

const app = express();
const port = process.env.BACKEND_PORT || 3000;

// Serve static files from the 'uploads' directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: `${process.env.NEXT_PUBLIC_FRONTEND_URL}:${process.env.FRONTEND_PORT}` || 'http://localhost:3000',
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization,X-CSRF-Token",
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(passport.initialize());
require('./config/passport')(passport);

app.use((req, res, next) => {
  const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.BACKEND_PORT}` || "http://localhost:3000";
  const csp = `script-src 'self' ${apiUrl};`;
  res.setHeader("Content-Security-Policy", csp);
  next();
});

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
app.use(authenticateJwt);

// Configure multer for file uploads
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Apply CSRF protection to all routes except /api/auth
const csrfProtection = csrf({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' } });
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth')) {
    return next();
  }
  csrfProtection(req, res, next);
});

// Apply script rules middleware to all routes except authentication
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/auth')) {
    applyScriptRules(req, res, next);
  } else {
    next();
  }
});

// Serve Swagger documentation
app.use('/api-docs', swaggerServe, swaggerSetup);

// Use centralized routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

module.exports = app;