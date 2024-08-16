const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');
const bcrypt = require('bcrypt');

// Create a new user
router.post('/', async (req, res) => {
  try {
    const { user_name, first_name, last_name, email, active, locked_out, password, password_needs_reset, last_login, source, department_id, role } = req.body;
    
    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const { rows } = await pool.query(
      'INSERT INTO sys_user (user_name, first_name, last_name, email, active, locked_out, password_hash, password_needs_reset, last_login, source, department_id, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [user_name, first_name, last_name, email, active, locked_out, password_hash, password_needs_reset, last_login, source, department_id, role]
    );
    
    // Don't send the password_hash back to the client
    const { password_hash: _, ...userWithoutPassword } = rows[0];
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all users (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM sys_user';
    const filterQuery = parseFilterQuery(req.query);
    if (filterQuery) {
      query += ` WHERE ${filterQuery}`;
    }
    const { rows } = await pool.query(query);
    // Remove password_hash from each user object
    const usersWithoutPassword = rows.map(({ password_hash, ...user }) => user);
    res.json(usersWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM sys_user WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      // Remove password_hash from the user object
      const { password_hash, ...userWithoutPassword } = rows[0];
      res.json(userWithoutPassword);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, first_name, last_name, email, active, locked_out, password, password_needs_reset, last_login, source, department_id, role } = req.body;

    let query = 'UPDATE sys_user SET user_name = $1, first_name = $2, last_name = $3, email = $4, active = $5, locked_out = $6, password_needs_reset = $7, last_login = $8, source = $9, department_id = $10, role = $11';
    let values = [user_name, first_name, last_name, email, active, locked_out, password_needs_reset, last_login, source, department_id, role];

    // If a new password is provided, hash it and add it to the update query
    if (password) {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      query += ', password_hash = $12';
      values.push(password_hash);
    }

    query += ' WHERE sys_id = $' + (values.length + 1) + ' RETURNING *';
    values.push(id);

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      // Remove password_hash from the response
      const { password_hash, ...userWithoutPassword } = rows[0];
      res.json(userWithoutPassword);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a user
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);

    // If a new password is provided, hash it
    if (updateFields.password) {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(updateFields.password, saltRounds);
      updateFields.password_hash = password_hash;
      delete updateFields.password;
    }

    values.push(id);

    const query = `UPDATE sys_user SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      // Remove password_hash from the response
      const { password_hash, ...userWithoutPassword } = rows[0];
      res.json(userWithoutPassword);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM sys_user WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;