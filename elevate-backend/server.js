require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authMiddleware = require('./authMiddleware');
const session = require('express-session');
const passport = require('passport');

// Import existing routes
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

// Import new routes
const departmentRoutes = require('./routes/department-routes');
const chatGroupRoutes = require('./routes/chat-group-routes');
const chatMessageRoutes = require('./routes/chat-message-routes');
const chatGroupMemberRoutes = require('./routes/chat-group-member-routes');
const surveyRoutes = require('./routes/survey-routes');
const surveyQuestionRoutes = require('./routes/survey-question-routes');
const surveyResponseRoutes = require('./routes/survey-response-routes');
const notificationStatusRoutes = require('./routes/notification-status-routes');
const userRoutes = require('./routes/user-routes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

// Public Routes
app.use('/api/auth', authRoutes);

app.use(authMiddleware);

// Existing Routes
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

// New Routes
app.use('/api/departments', departmentRoutes);
app.use('/api/chat-groups', chatGroupRoutes);
app.use('/api/chat-messages', chatMessageRoutes);
app.use('/api/chat-group-members', chatGroupMemberRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/survey-questions', surveyQuestionRoutes);
app.use('/api/survey-responses', surveyResponseRoutes);
app.use('/api/notification-statuses', notificationStatusRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
