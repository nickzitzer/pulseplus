const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { writeFile } = require('../utils/fileUtils');

// Create a new Point System
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { label, dollar_conversion } = req.body;
    let image_url = null;

    if (req.file) {
      const fileName = `point_system_${Date.now()}_${req.file.originalname}`;
      const filePath = await writeFile(fileName, req.file.buffer);
      image_url = `/uploads/${fileName}`;
    }

    const { rows } = await pool.query(
      'INSERT INTO point_system (label, image_url, dollar_conversion) VALUES ($1, $2, $3) RETURNING *',
      [label, image_url, dollar_conversion]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all Point Systems (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM point_system';
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

// Read a single Point System by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM point_system WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Point System not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a Point System
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { label, dollar_conversion } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
      const fileName = `point_system_${Date.now()}_${req.file.originalname}`;
      const filePath = await writeFile(fileName, req.file.buffer);
      image_url = `/uploads/${fileName}`;
    }

    const { rows } = await pool.query(
      'UPDATE point_system SET label = $1, image_url = $2, dollar_conversion = $3 WHERE sys_id = $4 RETURNING *',
      [label, image_url, dollar_conversion, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Point System not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a Point System
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE point_system SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Point System not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a Point System
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM point_system WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Point System not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;