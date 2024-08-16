const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new notification status
router.post('/', async (req, res) => {
  try {
    const { notification_id, user_id, read } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO notification_status (notification_id, user_id, read) VALUES ($1, $2, $3) RETURNING *',
      [notification_id, user_id, read]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification status for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query('SELECT * FROM notification_status WHERE user_id = $1', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notification status (mark as read)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body;
    const { rows } = await pool.query(
      'UPDATE notification_status SET read = $1, read_at = CURRENT_TIMESTAMP WHERE sys_id = $2 RETURNING *',
      [read, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Notification status not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a Notification Status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE notification_status SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Notification Status not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a notification status
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM notification_status WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Notification status not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;