const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new level
router.post('/', async (req, res) => {
  try {
    const { name, description, game, competition, type, image, order_num, color, entry_points } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO level (name, description, game, competition, type, image, order_num, color, entry_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, description, game, competition, type, image, order_num, color, entry_points]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all levels (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM level';
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

// Read a single level by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM level WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Level not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a level
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, game, competition, type, image, order_num, color, entry_points } = req.body;
    const { rows } = await pool.query(
      'UPDATE level SET name = $1, description = $2, game = $3, competition = $4, type = $5, image = $6, order_num = $7, color = $8, entry_points = $9 WHERE sys_id = $10 RETURNING *',
      [name, description, game, competition, type, image, order_num, color, entry_points, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Level not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a level
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE level SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Level not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a level
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM level WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Level not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;