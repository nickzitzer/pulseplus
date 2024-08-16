const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new Level Instance
router.post('/', async (req, res) => {
  try {
    const { level, start_date, end_date, order_num } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO level_instance (level, start_date, end_date, order_num) VALUES ($1, $2, $3, $4) RETURNING *',
      [level, start_date, end_date, order_num]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all Level Instances (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM level_instance';
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

// Read a single Level Instance by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM level_instance WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Level Instance not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a Level Instance
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { level, start_date, end_date, order_num } = req.body;
    const { rows } = await pool.query(
      'UPDATE level_instance SET level = $1, start_date = $2, end_date = $3, order_num = $4 WHERE sys_id = $5 RETURNING *',
      [level, start_date, end_date, order_num, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Level Instance not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a Level Instance
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE level_instance SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Level Instance not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a Level Instance
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM level_instance WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Level Instance not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;