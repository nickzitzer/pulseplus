const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const levelInstance = await databaseUtils.create('level_instance', req.body);
    res.status(201).json(levelInstance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const levelInstances = await databaseUtils.findAll('level_instance', filterQuery);
    res.json(levelInstances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const levelInstance = await databaseUtils.findOne('level_instance', req.params.id);
    if (!levelInstance) {
      res.status(404).json({ error: 'Level Instance not found' });
    } else {
      res.json(levelInstance);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const levelInstance = await databaseUtils.update('level_instance', id, req.body);
    if (!levelInstance) {
      res.status(404).json({ error: 'Level Instance not found' });
    } else {
      res.json(levelInstance);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const levelInstance = await databaseUtils.partialUpdate('level_instance', id, req.body);
    if (!levelInstance) {
      res.status(404).json({ error: 'Level Instance not found' });
    } else {
      res.json(levelInstance);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('level_instance', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Level Instance not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;