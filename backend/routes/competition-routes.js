const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { writeFile } = require('../utils/fileUtils');

// Create a new competition
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, description, game, start_date, end_date, competition_type, player_type } = req.body;
    let image_url = null;

    if (req.file) {
      const fileName = `competition_${Date.now()}_${req.file.originalname}`;
      const filePath = await writeFile(fileName, req.file.buffer);
      image_url = `/uploads/${fileName}`;
    }

    const { rows } = await pool.query(
      'INSERT INTO competition (name, description, game, start_date, end_date, competition_type, player_type, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, description, game, start_date, end_date, competition_type, player_type, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all competitions (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM competition';
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

// Read a single competition by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM competition WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Competition not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a competition
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, game, start_date, end_date, competition_type, player_type } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
      const fileName = `competition_${Date.now()}_${req.file.originalname}`;
      const filePath = await writeFile(fileName, req.file.buffer);
      image_url = `/uploads/${fileName}`;
    }

    const { rows } = await pool.query(
      'UPDATE competition SET name = $1, description = $2, game = $3, start_date = $4, end_date = $5, competition_type = $6, player_type = $7, image_url = $8 WHERE sys_id = $9 RETURNING *',
      [name, description, game, start_date, end_date, competition_type, player_type, image_url, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Competition not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a competition
router.patch('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    if (req.file) {
      const fileName = `competition_${Date.now()}_${req.file.originalname}`;
      const filePath = await writeFile(fileName, req.file.buffer);
      updateFields.image_url = `/uploads/${fileName}`;
    }

    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE competition SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Competition not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a competition
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM competition WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Competition not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;