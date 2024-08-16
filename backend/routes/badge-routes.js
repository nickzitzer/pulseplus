const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new badge
router.post('/', async (req, res) => {
  try {
    const { name, description, image, color, game } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO badge (name, description, image, color, game) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, image, color, game]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all badges (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM badge';
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

// Read a single badge by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM badge WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Badge not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a badge
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, color, game } = req.body;
    const { rows } = await pool.query(
      'UPDATE badge SET name = $1, description = $2, image = $3, color = $4, game = $5 WHERE sys_id = $6 RETURNING *',
      [name, description, image, color, game, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Badge not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a badge
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE badge SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Badge not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a badge
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM badge WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Badge not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;