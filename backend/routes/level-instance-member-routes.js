const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new Level Instance Member
router.post('/', async (req, res) => {
  try {
    const { level_instance, competitor, points, place, league_change, level_order } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO level_instance_member (level_instance, competitor, points, place, league_change, level_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [level_instance, competitor, points, place, league_change, level_order]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all Level Instance Members (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM level_instance_member';
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

// Read a single Level Instance Member by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM level_instance_member WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Level Instance Member not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a Level Instance Member
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { level_instance, competitor, points, place, league_change, level_order } = req.body;
    const { rows } = await pool.query(
      'UPDATE level_instance_member SET level_instance = $1, competitor = $2, points = $3, place = $4, league_change = $5, level_order = $6 WHERE sys_id = $7 RETURNING *',
      [level_instance, competitor, points, place, league_change, level_order, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Level Instance Member not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a Level Instance Member
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM level_instance_member WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Level Instance Member not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
