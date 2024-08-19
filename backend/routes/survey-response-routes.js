const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

// Submit a survey response
router.post('/', async (req, res) => {
  try {
    const surveyResponse = await databaseUtils.create('survey_response', req.body);
    res.status(201).json(surveyResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all responses for a specific survey
router.get('/survey/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const filterQuery = `survey_id = '${surveyId}'`;
    const surveyResponses = await databaseUtils.findAll('survey_response', filterQuery);
    res.json(surveyResponses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single survey response by ID
router.get('/:id', async (req, res) => {
  try {
    const surveyResponse = await databaseUtils.findOne('survey_response', req.params.id);
    if (!surveyResponse) {
      res.status(404).json({ error: 'Survey response not found' });
    } else {
      res.json(surveyResponse);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a Survey Response
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const surveyResponse = await databaseUtils.partialUpdate('survey_response', id, req.body);
    if (!surveyResponse) {
      res.status(404).json({ error: 'Survey Response not found' });
    } else {
      res.json(surveyResponse);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a survey response
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('survey_response', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Survey response not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;