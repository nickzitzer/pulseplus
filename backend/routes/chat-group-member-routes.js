const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Add a member to a chat group
router.post('/', async (req, res) => {
  try {
    const { chat_group_id, user_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO chat_group_member (chat_group_id, user_id) VALUES ($1, $2) RETURNING *',
      [chat_group_id, user_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all members of a chat group
router.get('/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { rows } = await pool.query(
      'SELECT cgm.*, su.user_name, su.first_name, su.last_name FROM chat_group_member cgm JOIN sys_user su ON cgm.user_id = su.sys_id WHERE cgm.chat_group_id = $1',
      [groupId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a member from a chat group
router.delete('/:groupId/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM chat_group_member WHERE chat_group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: 'Chat group member not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a Chat Group Member
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE chat_group_member SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Chat Group Member not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;