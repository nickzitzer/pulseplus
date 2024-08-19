const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const goal = await databaseUtils.create('goal', req.body);
    res.status(201).json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const goals = await databaseUtils.findAll('goal', filterQuery);
    res.json(goals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const goal = await databaseUtils.findOne('goal', req.params.id);
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
    } else {
      res.json(goal);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await databaseUtils.update('goal', id, req.body);
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
    } else {
      res.json(goal);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await databaseUtils.partialUpdate('goal', id, req.body);
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
    } else {
      res.json(goal);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('goal', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Goal not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;