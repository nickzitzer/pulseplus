const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new goal
router.post('/', async (req, res) => {
  try {
    const { name, description, game, achievement, recurring, target, type, competitors, active, color } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO goal (name, description, game, achievement, recurring, target, type, competitors, active, color) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name, description, game, achievement, recurring, target, type, competitors, active, color]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all goals (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM goal';
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

// Read a single goal by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM goal WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Goal not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a goal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, game, achievement, recurring, target, type, competitors, active, color } = req.body;
    const { rows } = await pool.query(
      'UPDATE goal SET name = $1, description = $2, game = $3, achievement = $4, recurring = $5, target = $6, type = $7, competitors = $8, active = $9, color = $10 WHERE sys_id = $11 RETURNING *',
      [name, description, game, achievement, recurring, target, type, competitors, active, color, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Goal not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a goal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM goal WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Goal not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
