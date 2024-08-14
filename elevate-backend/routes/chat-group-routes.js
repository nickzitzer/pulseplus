const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new chat group
router.post('/', async (req, res) => {
  try {
    const { name, created_by } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO chat_group (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, created_by]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all chat groups (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM chat_group';
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

// Read a single chat group by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM chat_group WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Chat group not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a chat group
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { rows } = await pool.query(
      'UPDATE chat_group SET name = $1 WHERE sys_id = $2 RETURNING *',
      [name, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Chat group not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a chat group
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM chat_group WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Chat group not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
