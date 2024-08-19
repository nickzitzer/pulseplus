const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const kpi = await databaseUtils.create('kpi', req.body);
    res.status(201).json(kpi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const kpis = await databaseUtils.findAll('kpi', filterQuery);
    res.json(kpis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const kpi = await databaseUtils.findOne('kpi', req.params.id);
    if (!kpi) {
      res.status(404).json({ error: 'KPI not found' });
    } else {
      res.json(kpi);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const kpi = await databaseUtils.update('kpi', id, req.body);
    if (!kpi) {
      res.status(404).json({ error: 'KPI not found' });
    } else {
      res.json(kpi);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const kpi = await databaseUtils.partialUpdate('kpi', id, req.body);
    if (!kpi) {
      res.status(404).json({ error: 'KPI not found' });
    } else {
      res.json(kpi);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('kpi', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'KPI not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;