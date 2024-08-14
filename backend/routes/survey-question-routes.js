const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Create a new survey question
router.post('/', async (req, res) => {
  try {
    const { survey_id, question_text, question_type, options } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO survey_question (survey_id, question_text, question_type, options) VALUES ($1, $2, $3, $4) RETURNING *',
      [survey_id, question_text, question_type, JSON.stringify(options)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all survey questions for a specific survey
router.get('/survey/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const { rows } = await pool.query('SELECT * FROM survey_question WHERE survey_id = $1', [surveyId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read a single survey question by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM survey_question WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Survey question not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a survey question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { question_text, question_type, options } = req.body;
    const { rows } = await pool.query(
      'UPDATE survey_question SET question_text = $1, question_type = $2, options = $3 WHERE sys_id = $4 RETURNING *',
      [question_text, question_type, JSON.stringify(options), id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Survey question not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a survey question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM survey_question WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
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
