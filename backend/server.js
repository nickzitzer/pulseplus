require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandlers');
const logger = require('./utils/logger');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const applyScriptRules = require('./middleware/scriptRulesMiddleware');

// Platform Routes
const happyTechPlatformRoutes = require('./routes/happytechplatform-routes');

// Import routes
const authRoutes = require('./routes/auth-routes');
const gameRoutes = require('./routes/game-routes');
const competitionRoutes = require('./routes/competition-routes');
const competitorRoutes = require('./routes/competitor-routes');
const badgeRoutes = require('./routes/badge-routes');
const achievementRoutes = require('./routes/achievement-routes');
const levelRoutes = require('./routes/level-routes');
const goalRoutes = require('./routes/goal-routes');
const kpiRoutes = require('./routes/kpi-routes');
const pointSystemRoutes = require('./routes/point-system-routes');
const teamRoutes = require('./routes/team-routes');
const notifierRoutes = require('./routes/notifier-routes');
const levelInstanceRoutes = require('./routes/level-instance-routes');
const levelInstanceMemberRoutes = require('./routes/level-instance-member-routes');
const leaderboardMemberRoutes = require('./routes/leaderboard-member-routes');
const m2mRoutes = require('./routes/m2m-routes');
const departmentRoutes = require('./routes/department-routes');
const chatGroupRoutes = require('./routes/chat-group-routes');
const chatMessageRoutes = require('./routes/chat-message-routes');
const chatGroupMemberRoutes = require('./routes/chat-group-member-routes');
const surveyRoutes = require('./routes/survey-routes');
const surveyQuestionRoutes = require('./routes/survey-question-routes');
const surveyResponseRoutes = require('./routes/survey-response-routes');
const notificationStatusRoutes = require('./routes/notification-status-routes');
const userRoutes = require('./routes/user-routes');
const ssoRoutes = require('./routes/sso-routes');
const scriptRuleRoutes = require('./routes/script-rule-routes');

const app = express();
const port = process.env.BACKEND_PORT || 3000;

// Serve static files from the 'uploads' directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Middleware
app.use(helmet());
// CORS Configuration
const corsOptions = {
  origin: `${process.env.NEXT_PUBLIC_FRONTEND_URL}:${process.env.FRONTEND_PORT}` || 'http://localhost:3000', // Allow requests from the frontend
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization,X-CSRF-Token", // Add X-CSRF-Token here
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(passport.initialize());
require('./config/passport')(passport);

app.use((req, res, next) => {
  const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.BACKEND_PORT}` || "http://localhost:3000"; // Fallback if not set
  const csp = `script-src 'self' ${apiUrl};`; // Include the API URL in the CSP
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

// Routes
app.use('/api/happytechplatform', happyTechPlatformRoutes);
app.use('/api/auth/sso', ssoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/competitors', competitorRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/point-systems', pointSystemRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/notifiers', notifierRoutes);
app.use('/api/level-instances', levelInstanceRoutes);
app.use('/api/level-instance-members', levelInstanceMemberRoutes);
app.use('/api/leaderboard-members', leaderboardMemberRoutes);
app.use('/api/m2m', m2mRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/chat-groups', chatGroupRoutes);
app.use('/api/chat-messages', chatMessageRoutes);
app.use('/api/chat-group-members', chatGroupMemberRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/survey-questions', surveyQuestionRoutes);
app.use('/api/survey-responses', surveyResponseRoutes);
app.use('/api/notification-statuses', notificationStatusRoutes);
app.use('/api/users', userRoutes);
app.use('/api/script-rules', scriptRuleRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

module.exports = app;