const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new Team
router.post('/', async (req, res) => {
  try {
    const { name, members, image } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO team (name, members, image) VALUES ($1, $2, $3) RETURNING *',
      [name, members, image]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all Teams (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM team';
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

// Read a single Team by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM team WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Team not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a Team
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, members, image } = req.body;
    const { rows } = await pool.query(
      'UPDATE team SET name = $1, members = $2, image = $3 WHERE sys_id = $4 RETURNING *',
      [name, members, image, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Team not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a Team
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE team SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Team not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a Team
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM team WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Team not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;