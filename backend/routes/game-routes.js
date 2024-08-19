const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { processImageUpload, deleteFile } = require('../utils/fileUtils');
const databaseUtils = require('../utils/databaseUtils');
const path = require('path');

router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'background', maxCount: 1 }]), async (req, res) => {
  try {
    const imageData = await processImageUpload(req.files['image'][0], 'image_url');
    const backgroundData = await processImageUpload(req.files['background'][0], 'background_url');
    const game = await databaseUtils.create('game', {
      ...req.body,
      image_url: imageData.image_url,
      background_url: backgroundData.background_url
    });
    res.status(201).json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const games = await databaseUtils.findAll('game', filterQuery);
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const game = await databaseUtils.findOne('game', req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
    } else {
      res.json(game);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'background', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const imageData = await processImageUpload(req.files['image'] ? req.files['image'][0] : null, 'image_url', id, 'game');
    const backgroundData = await processImageUpload(req.files['background'] ? req.files['background'][0] : null, 'background_url', id, 'game');
    const game = await databaseUtils.update('game', id, {
      ...req.body,
      image_url: imageData.image_url,
      background_url: backgroundData.background_url
    });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
    } else {
      if (imageData.oldImageUrl) {
        await deleteFile(path.join(__dirname, '..', imageData.oldImageUrl));
      }
      if (backgroundData.oldImageUrl) {
        await deleteFile(path.join(__dirname, '..', backgroundData.oldImageUrl));
      }
      res.json(game);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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