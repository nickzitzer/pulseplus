const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const survey = await databaseUtils.create('survey', req.body);
    res.status(201).json(survey);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const surveys = await databaseUtils.findAll('survey', filterQuery);
    res.json(surveys);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const survey = await databaseUtils.findOne('survey', req.params.id);
    if (!survey) {
      res.status(404).json({ error: 'Survey not found' });
    } else {
      res.json(survey);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await databaseUtils.update('survey', id, req.body);
    if (!survey) {
      res.status(404).json({ error: 'Survey not found' });
    } else {
      res.json(survey);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await databaseUtils.partialUpdate('survey', id, req.body);
    if (!survey) {
      res.status(404).json({ error: 'Survey not found' });
    } else {
      res.json(survey);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('survey', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Survey not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;