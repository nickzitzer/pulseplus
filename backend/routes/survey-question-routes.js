const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const surveyQuestion = await databaseUtils.create('survey_question', req.body);
    res.status(201).json(surveyQuestion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/survey/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const filterQuery = `survey_id = '${surveyId}'`;
    const surveyQuestions = await databaseUtils.findAll('survey_question', filterQuery);
    res.json(surveyQuestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const surveyQuestion = await databaseUtils.findOne('survey_question', req.params.id);
    if (!surveyQuestion) {
      res.status(404).json({ error: 'Survey question not found' });
    } else {
      res.json(surveyQuestion);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const surveyQuestion = await databaseUtils.update('survey_question', id, req.body);
    if (!surveyQuestion) {
      res.status(404).json({ error: 'Survey question not found' });
    } else {
      res.json(surveyQuestion);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const surveyQuestion = await databaseUtils.partialUpdate('survey_question', id, req.body);
    if (!surveyQuestion) {
      res.status(404).json({ error: 'Survey question not found' });
    } else {
      res.json(surveyQuestion);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('survey_question', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Survey question not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;