const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const department = await databaseUtils.create('department', req.body);
    res.status(201).json(department);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const departments = await databaseUtils.findAll('department', filterQuery);
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const department = await databaseUtils.findOne('department', req.params.id);
    if (!department) {
      res.status(404).json({ error: 'Department not found' });
    } else {
      res.json(department);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const department = await databaseUtils.update('department', id, req.body);
    if (!department) {
      res.status(404).json({ error: 'Department not found' });
    } else {
      res.json(department);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const department = await databaseUtils.partialUpdate('department', id, req.body);
    if (!department) {
      res.status(404).json({ error: 'Department not found' });
    } else {
      res.json(department);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('department', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Department not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;