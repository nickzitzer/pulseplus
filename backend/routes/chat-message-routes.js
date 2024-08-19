const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const chatMessage = await databaseUtils.create('chat_message', req.body);
    res.status(201).json(chatMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const chatMessages = await databaseUtils.findAll('chat_message', filterQuery);
    res.json(chatMessages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const chatMessage = await databaseUtils.findOne('chat_message', req.params.id);
    if (!chatMessage) {
      res.status(404).json({ error: 'Chat message not found' });
    } else {
      res.json(chatMessage);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatMessage = await databaseUtils.update('chat_message', id, req.body);
    if (!chatMessage) {
      res.status(404).json({ error: 'Chat message not found' });
    } else {
      res.json(chatMessage);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatMessage = await databaseUtils.partialUpdate('chat_message', id, req.body);
    if (!chatMessage) {
      res.status(404).json({ error: 'Chat message not found' });
    } else {
      res.json(chatMessage);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('chat_message', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Chat message not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;