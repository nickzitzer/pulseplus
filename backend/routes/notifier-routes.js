const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const notifier = await databaseUtils.create('notifier', req.body);
    res.status(201).json(notifier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const notifiers = await databaseUtils.findAll('notifier', filterQuery);
    res.json(notifiers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const notifier = await databaseUtils.findOne('notifier', req.params.id);
    if (!notifier) {
      res.status(404).json({ error: 'Notifier not found' });
    } else {
      res.json(notifier);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notifier = await databaseUtils.update('notifier', id, req.body);
    if (!notifier) {
      res.status(404).json({ error: 'Notifier not found' });
    } else {
      res.json(notifier);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notifier = await databaseUtils.partialUpdate('notifier', id, req.body);
    if (!notifier) {
      res.status(404).json({ error: 'Notifier not found' });
    } else {
      res.json(notifier);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('notifier', req.params.id);
    if (!deleted) {
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