const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');

const createCRUD = (tableName) => {
  const routes = express.Router();

  routes.post('/', async (req, res) => {
    try {
      const result = await databaseUtils.create(tableName, req.body);
      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  routes.get('/', async (req, res) => {
    try {
      const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
      const results = await databaseUtils.findAll(tableName, filterQuery);
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  routes.get('/:id', async (req, res) => {
    try {
      const result = await databaseUtils.findOne(tableName, req.params.id);
      if (!result) {
        res.status(404).json({ error: 'Record not found' });
      } else {
        res.json(result);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  routes.put('/:id', async (req, res) => {
    try {
      const result = await databaseUtils.update(tableName, req.params.id, req.body);
      if (!result) {
        res.status(404).json({ error: 'Record not found' });
      } else {
        res.json(result);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  routes.patch('/:id', async (req, res) => {
    try {
      const result = await databaseUtils.partialUpdate(tableName, req.params.id, req.body);
      if (!result) {
        res.status(404).json({ error: 'Record not found' });
      } else {
        res.json(result);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  routes.delete('/:id', async (req, res) => {
    try {
      const deleted = await databaseUtils.delete(tableName, req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Record not found' });
      } else {
        res.status(204).send();
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return routes;
};

// Create routes for each m2m table
router.use('/badge-competitor', createCRUD('x_tusk_pulseplus_m2m_badges_competitors'));
router.use('/achievement-competitor', createCRUD('x_tusk_pulseplus_m2m_achievements_competitors'));
router.use('/team-competition', createCRUD('x_tusk_pulseplus_m2m_teams_competitions'));

module.exports = router;