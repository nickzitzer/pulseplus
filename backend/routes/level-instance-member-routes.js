const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

router.post('/', async (req, res) => {
  try {
    const levelInstanceMember = await databaseUtils.create('level_instance_member', req.body);
    res.status(201).json(levelInstanceMember);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const levelInstanceMembers = await databaseUtils.findAll('level_instance_member', filterQuery);
    res.json(levelInstanceMembers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const levelInstanceMember = await databaseUtils.findOne('level_instance_member', req.params.id);
    if (!levelInstanceMember) {
      res.status(404).json({ error: 'Level Instance Member not found' });
    } else {
      res.json(levelInstanceMember);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const levelInstanceMember = await databaseUtils.update('level_instance_member', id, req.body);
    if (!levelInstanceMember) {
      res.status(404).json({ error: 'Level Instance Member not found' });
    } else {
      res.json(levelInstanceMember);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const levelInstanceMember = await databaseUtils.partialUpdate('level_instance_member', id, req.body);
    if (!levelInstanceMember) {
      res.status(404).json({ error: 'Level Instance Member not found' });
    } else {
      res.json(levelInstanceMember);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('level_instance_member', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Level Instance Member not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;