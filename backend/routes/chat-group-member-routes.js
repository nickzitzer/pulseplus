const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const chatGroupMember = await databaseUtils.create('chat_group_member', req.body);
    res.status(201).json(chatGroupMember);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const chatGroupMembers = await databaseUtils.findAll('chat_group_member', filterQuery);
    res.json(chatGroupMembers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const chatGroupMember = await databaseUtils.findOne('chat_group_member', req.params.id);
    if (!chatGroupMember) {
      res.status(404).json({ error: 'Chat Group Member not found' });
    } else {
      res.json(chatGroupMember);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatGroupMember = await databaseUtils.update('chat_group_member', id, req.body);
    if (!chatGroupMember) {
      res.status(404).json({ error: 'Chat Group Member not found' });
    } else {
      res.json(chatGroupMember);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatGroupMember = await databaseUtils.partialUpdate('chat_group_member', id, req.body);
    if (!chatGroupMember) {
      res.status(404).json({ error: 'Chat Group Member not found' });
    } else {
      res.json(chatGroupMember);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('chat_group_member', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Chat Group Member not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;