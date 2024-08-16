const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new competitor
router.post('/', async (req, res) => {
  try {
    const { user_id, total_earnings, account_balance, performance_group } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO competitor (user_id, total_earnings, account_balance, performance_group) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, total_earnings, account_balance, performance_group]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current competitor
router.get('/current', async (req, res) => {
  console.log('Full request object:', req); // Log the entire request object
  console.log('Full user object:', req.user); // Log the entire user object

  if (!req.user) {
    return res.status(400).json({ error: 'No user object on request' });
  }

  // Assuming sys_id is the correct property, but let's check to make sure
  const userId = req.user.sys_id || req.user.id; // Fallback to 'id' if 'sys_id' doesn't exist
  console.log('Current User ID:', userId);

  if (!userId) {
    return res.status(400).json({ error: 'User ID not found in the authenticated user object' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM competitor WHERE user_id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    const competitorData = rows[0];
    res.json(competitorData);
  } catch (err) {
    console.error('Error in /competitor/current:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Read a single competitor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM competitor WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Competitor not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all competitors (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM competitor';
    const filterQuery = parseFilterQuery(req.query);
    if (filterQuery) {
      query += ` WHERE ${filterQuery}`;
    }
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a competitor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, total_earnings, account_balance, performance_group } = req.body;
    const { rows } = await pool.query(
      'UPDATE competitor SET user_id = $1, total_earnings = $2, account_balance = $3, performance_group = $4 WHERE sys_id = $5 RETURNING *',
      [user_id, total_earnings, account_balance, performance_group, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Competitor not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a competitor
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE competitor SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Competitor not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a competitor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM competitor WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Competitor not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;