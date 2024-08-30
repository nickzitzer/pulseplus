const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const Joi = require('joi');
const csrf = require('csurf');
const databaseUtils = require('../utils/databaseUtils');

const loginSchema = Joi.object({
  user_name: Joi.string().required(),
  password: Joi.string().required()
});

const SESSION_DURATION = process.env.SESSION_DURATION || '30m';

const csrfProtection = csrf({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' } });

router.post('/login', async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { user_name, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM sys_user WHERE user_name = $1', [user_name]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { rows: competitorRows } = await pool.query('SELECT * FROM competitor WHERE user_id = $1', [user.sys_id]);
    const competitor = competitorRows[0] || null;

    const token = jwt.sign(
      { id: user.sys_id, exp: Math.floor(Date.now() / 1000) + (60 * 30) },
      process.env.JWT_SECRET
    );
    
    delete user.password_hash;

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });

    res.json({ user, competitor });
  } catch (error) {
    next(error);
  }
});

router.get('/sso-providers', async (req, res) => {
  try {
    const providers = await databaseUtils.findAll('sso_provider', 'active = true');
    console.log('Providers - ' + JSON.stringify(providers));
    res.json(providers.length === 0 ? null : providers.map(({ sys_id, name }) => ({ sys_id, name })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

router.post('/refresh-token', csrfProtection, (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { id: decoded.id, exp: Math.floor(Date.now() / 1000) + (60 * 30) },
      process.env.JWT_SECRET
    );
    res.cookie('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });
    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

router.post('/logout', csrfProtection, (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', csrfProtection, async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows: userRows } = await pool.query('SELECT * FROM sys_user WHERE sys_id = $1', [decoded.id]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRows[0];
    delete user.password_hash;

    const { rows: competitorRows } = await pool.query('SELECT * FROM competitor WHERE user_id = $1', [user.sys_id]);
    const competitor = competitorRows[0] || null;

    res.json({ user, competitor });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Error in /auth/me:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;