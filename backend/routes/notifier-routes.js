const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new Notifier
router.post('/', async (req, res) => {
  try {
    const { description, receiver, seen, sender, notification_type } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO notifier (description, receiver, seen, sender, notification_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [description, receiver, seen, sender, notification_type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all Notifiers (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM notifier';
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

// Read a single Notifier by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM notifier WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Notifier not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a Notifier
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, receiver, seen, sender, notification_type } = req.body;
    const { rows } = await pool.query(
      'UPDATE notifier SET description = $1, receiver = $2, seen = $3, sender = $4, notification_type = $5 WHERE sys_id = $6 RETURNING *',
      [description, receiver, seen, sender, notification_type, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Notifier not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a Notifier
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE notifier SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Notifier not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a Notifier
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM notifier WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Notifier not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;