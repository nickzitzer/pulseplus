const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');

// Helper function to create CRUD operations for a table
const createCRUD = (tableName) => {
  const routes = express.Router();

  // Create
  routes.post('/', async (req, res) => {
    try {
      const columns = Object.keys(req.body).join(', ');
      const values = Object.values(req.body);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const { rows } = await pool.query(
        `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Read all (with optional filtering)
  routes.get('/', async (req, res) => {
    try {
      let query = `SELECT * FROM ${tableName}`;
      const filterQuery = parseFilterQuery(req.query);
      if (filterQuery) {
        query += ` WHERE ${filterQuery}`;
      }
      const { rows } = await pool.query(query);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Read one by ID
  routes.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(`SELECT * FROM ${tableName} WHERE sys_id = $1`, [id]);
      if (rows.length === 0) {
        res.status(404).json({ error: 'Record not found' });
      } else {
        res.json(rows[0]);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update
  routes.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const columns = Object.keys(req.body);
      const values = Object.values(req.body);
      const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
      const { rows } = await pool.query(
        `UPDATE ${tableName} SET ${setClause} WHERE sys_id = $${columns.length + 1} RETURNING *`,
        [...values, id]
      );
      if (rows.length === 0) {
        res.status(404).json({ error: 'Record not found' });
      } else {
        res.json(rows[0]);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Partial update
  routes.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = req.body;
      
      const setClause = Object.keys(updateFields)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ');
      
      const values = Object.values(updateFields);
      values.push(id);

      const query = `UPDATE ${tableName} SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
      
      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) {
        res.status(404).json({ error: 'Record not found' });
      } else {
        res.json(rows[0]);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete
  routes.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query(`DELETE FROM ${tableName} WHERE sys_id = $1`, [id]);
      if (rowCount === 0) {
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