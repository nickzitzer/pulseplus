const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new KPI
router.post('/', async (req, res) => {
  try {
    const { name, description, game, type, aggregation, table_name, field, condition, achievement, order_num } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO key_performance_indicator (name, description, game, type, aggregation, table_name, field, condition, achievement, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name, description, game, type, aggregation, table_name, field, condition, achievement, order_num]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all KPIs (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM key_performance_indicator';
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

// Read a single KPI by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM key_performance_indicator WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'KPI not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a KPI
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, game, type, aggregation, table_name, field, condition, achievement, order_num } = req.body;
    const { rows } = await pool.query(
      'UPDATE key_performance_indicator SET name = $1, description = $2, game = $3, type = $4, aggregation = $5, table_name = $6, field = $7, condition = $8, achievement = $9, order_num = $10 WHERE sys_id = $11 RETURNING *',
      [name, description, game, type, aggregation, table_name, field, condition, achievement, order_num, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'KPI not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a KPI
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE key_performance_indicator SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'KPI not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a KPI
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM key_performance_indicator WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'KPI not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;