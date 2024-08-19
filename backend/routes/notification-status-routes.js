const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const notificationStatus = await databaseUtils.create('notification_status', req.body);
    res.status(201).json(notificationStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const filterQuery = `user_id = '${userId}'`;
    const notificationStatuses = await databaseUtils.findAll('notification_status', filterQuery);
    res.json(notificationStatuses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notificationStatus = await databaseUtils.update('notification_status', id, req.body);
    if (!notificationStatus) {
      res.status(404).json({ error: 'Notification status not found' });
    } else {
      res.json(notificationStatus);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notificationStatus = await databaseUtils.partialUpdate('notification_status', id, req.body);
    if (!notificationStatus) {
      res.status(404).json({ error: 'Notification Status not found' });
    } else {
      res.json(notificationStatus);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('notification_status', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Notification status not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;