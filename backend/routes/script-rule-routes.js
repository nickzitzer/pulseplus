const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const scriptRule = await databaseUtils.create('script_rule', req.body);
    res.status(201).json(scriptRule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const scriptRules = await databaseUtils.findAll('script_rule', filterQuery);
    res.json(scriptRules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const scriptRule = await databaseUtils.findOne('script_rule', req.params.id);
    if (!scriptRule) {
      res.status(404).json({ error: 'Script Rule not found' });
    } else {
      res.json(scriptRule);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const scriptRule = await databaseUtils.update('script_rule', id, req.body);
    if (!scriptRule) {
      res.status(404).json({ error: 'Script Rule not found' });
    } else {
      res.json(scriptRule);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const scriptRule = await databaseUtils.partialUpdate('script_rule', id, req.body);
    if (!scriptRule) {
      res.status(404).json({ error: 'Script Rule not found' });
    } else {
      res.json(scriptRule);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('script_rule', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Script Rule not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;