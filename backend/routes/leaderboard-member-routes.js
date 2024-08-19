const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const leaderboardMember = await databaseUtils.create('leaderboard_member', req.body);
    res.status(201).json(leaderboardMember);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const leaderboardMembers = await databaseUtils.findAll('leaderboard_member', filterQuery);
    res.json(leaderboardMembers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const leaderboardMember = await databaseUtils.findOne('leaderboard_member', req.params.id);
    if (!leaderboardMember) {
      res.status(404).json({ error: 'Leaderboard Member not found' });
    } else {
      res.json(leaderboardMember);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const leaderboardMember = await databaseUtils.update('leaderboard_member', id, req.body);
    if (!leaderboardMember) {
      res.status(404).json({ error: 'Leaderboard Member not found' });
    } else {
      res.json(leaderboardMember);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const leaderboardMember = await databaseUtils.partialUpdate('leaderboard_member', id, req.body);
    if (!leaderboardMember) {
      res.status(404).json({ error: 'Leaderboard Member not found' });
    } else {
      res.json(leaderboardMember);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('leaderboard_member', req.params.id);
    if (!deleted) {
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