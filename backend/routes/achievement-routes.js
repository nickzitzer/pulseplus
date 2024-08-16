const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new achievement
router.post('/', async (req, res) => {
  try {
    const { name, description, game, trigger_table, trigger_condition, awardee, point_value, active } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO achievement (name, description, game, trigger_table, trigger_condition, awardee, point_value, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, description, game, trigger_table, trigger_condition, awardee, point_value, active]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all achievements (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM achievement';
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

// Read a single achievement by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM achievement WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Achievement not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an achievement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, game, trigger_table, trigger_condition, awardee, point_value, active } = req.body;
    const { rows } = await pool.query(
      'UPDATE achievement SET name = $1, description = $2, game = $3, trigger_table = $4, trigger_condition = $5, awardee = $6, point_value = $7, active = $8 WHERE sys_id = $9 RETURNING *',
      [name, description, game, trigger_table, trigger_condition, awardee, point_value, active, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Achievement not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of an achievement
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE achievement SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Achievement not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an achievement
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM achievement WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Achievement not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;