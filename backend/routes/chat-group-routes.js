const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const chatGroup = await databaseUtils.create('chat_group', req.body);
    res.status(201).json(chatGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const chatGroups = await databaseUtils.findAll('chat_group', filterQuery);
    res.json(chatGroups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const chatGroup = await databaseUtils.findOne('chat_group', req.params.id);
    if (!chatGroup) {
      res.status(404).json({ error: 'Chat Group not found' });
    } else {
      res.json(chatGroup);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatGroup = await databaseUtils.update('chat_group', id, req.body);
    if (!chatGroup) {
      res.status(404).json({ error: 'Chat Group not found' });
    } else {
      res.json(chatGroup);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatGroup = await databaseUtils.partialUpdate('chat_group', id, req.body);
    if (!chatGroup) {
      res.status(404).json({ error: 'Chat Group not found' });
    } else {
      res.json(chatGroup);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('chat_group', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Chat Group not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;