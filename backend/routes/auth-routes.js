const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const Joi = require('joi');

const loginSchema = Joi.object({
  user_name: Joi.string().required(),
  password: Joi.string().required()
});

// NIST recommends a maximum of 30 minutes for session duration
const SESSION_DURATION = process.env.SESSION_DURATION || '30m';

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

    // Fetch competitor data
    const { rows: competitorRows } = await pool.query('SELECT * FROM competitor WHERE user_id = $1', [user.sys_id]);
    const competitor = competitorRows[0] || null;

    const token = jwt.sign(
      { id: user.sys_id, exp: Math.floor(Date.now() / 1000) + (60 * 30) }, // 30 minutes expiration
      process.env.JWT_SECRET
    );
    
    // Remove sensitive information from user object
    delete user.password_hash;

    res.json({ token, user, competitor, expiresIn: SESSION_DURATION });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh-token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { id: decoded.id, exp: Math.floor(Date.now() / 1000) + (60 * 30) },
      process.env.JWT_SECRET
    );
    res.json({ token: newToken, expiresIn: SESSION_DURATION });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;