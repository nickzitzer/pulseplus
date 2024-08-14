const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new Leaderboard Member
router.post('/', async (req, res) => {
  try {
    const { competition, competitor, competitor_type, points, place } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO leaderboard_member (competition, competitor, competitor_type, points, place) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [competition, competitor, competitor_type, points, place]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all Leaderboard Members (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM leaderboard_member';
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

// Read a single Leaderboard Member by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM leaderboard_member WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Leaderboard Member not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a Leaderboard Member
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { competition, competitor, competitor_type, points, place } = req.body;
    const { rows } = await pool.query(
      'UPDATE leaderboard_member SET competition = $1, competitor = $2, competitor_type = $3, points = $4, place = $5 WHERE sys_id = $6 RETURNING *',
      [competition, competitor, competitor_type, points, place, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Leaderboard Member not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a Leaderboard Member
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM leaderboard_member WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Leaderboard Member not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
