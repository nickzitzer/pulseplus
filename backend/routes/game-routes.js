const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { writeFile } = require('../utils/fileUtils');

// Create a new game
router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'background', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, description, gamemaster, point_system, active } = req.body;
    let image_url = null;
    let background_url = null;

    if (req.files['image']) {
      const fileName = `game_image_${Date.now()}_${req.files['image'][0].originalname}`;
      const filePath = await writeFile(fileName, req.files['image'][0].buffer);
      image_url = `/uploads/${fileName}`;
    }

    if (req.files['background']) {
      const fileName = `game_background_${Date.now()}_${req.files['background'][0].originalname}`;
      const filePath = await writeFile(fileName, req.files['background'][0].buffer);
      background_url = `/uploads/${fileName}`;
    }

    const { rows } = await pool.query(
      'INSERT INTO game (name, description, gamemaster, point_system, active, image_url, background_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, gamemaster, point_system, active, image_url, background_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all games (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM game';
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

// Read a single game by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM game WHERE sys_id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a game
router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'background', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, gamemaster, point_system, active } = req.body;
    let image_url = req.body.image_url;
    let background_url = req.body.background_url;

    if (req.files['image']) {
      const fileName = `game_image_${Date.now()}_${req.files['image'][0].originalname}`;
      const filePath = await writeFile(fileName, req.files['image'][0].buffer);
      image_url = `/uploads/${fileName}`;
    }

    if (req.files['background']) {
      const fileName = `game_background_${Date.now()}_${req.files['background'][0].originalname}`;
      const filePath = await writeFile(fileName, req.files['background'][0].buffer);
      background_url = `/uploads/${fileName}`;
    }

    const { rows } = await pool.query(
      'UPDATE game SET name = $1, description = $2, gamemaster = $3, point_system = $4, active = $5, image_url = $6, background_url = $7 WHERE sys_id = $8 RETURNING *',
      [name, description, gamemaster, point_system, active, image_url, background_url, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a game
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateFields);
    values.push(id);

    const query = `UPDATE game SET ${setClause} WHERE sys_id = $${values.length} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a game
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM game WHERE sys_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Game not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;