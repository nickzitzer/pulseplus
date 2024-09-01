const express = require('express');
const router = express.Router();
const { pool, parseFilterQuery } = require('../db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { processImageUpload, deleteFile, handleFileUpdate } = require('../utils/fileUtils');
const databaseUtils = require('../utils/databaseUtils');
const path = require('path');

router.post('/', upload.fields([{ name: 'image_url', maxCount: 1 }, { name: 'background_url', maxCount: 1 }]), async (req, res) => {
  try {
    const imageData = await processImageUpload(req.files['image_url'] ? req.files['image_url'][0] : null, 'image_url');
    const backgroundData = await processImageUpload(req.files['background_url'] ? req.files['background_url'][0] : null, 'background_url');
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

router.put('/:id', upload.fields([{ name: 'image_url', maxCount: 1 }, { name: 'background_url', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const imageUpdateResult = await handleFileUpdate(req.files['image_url'] ? req.files['image_url'][0] : null, 'image_url', id, 'game');
    const backgroundUpdateResult = await handleFileUpdate(req.files['background_url'] ? req.files['background_url'][0] : null, 'background_url', id, 'game');
    const game = await databaseUtils.update('game', id, {
      ...req.body,
      image_url: imageUpdateResult.image_url,
      background_url: backgroundUpdateResult.background_url
    });
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

router.patch('/:id', upload.fields([{ name: 'image_url', maxCount: 1 }, { name: 'background_url', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    const imageUpdateResult = await handleFileUpdate(req.files['image_url'] ? req.files['image_url'][0] : null, 'image_url', id, 'game');
    const backgroundUpdateResult = await handleFileUpdate(req.files['background_url'] ? req.files['background_url'][0] : null, 'background_url', id, 'game');
    if (imageUpdateResult.image_url) {
      updateFields.image_url = imageUpdateResult.image_url;
    }
    if (backgroundUpdateResult.background_url) {
      updateFields.background_url = backgroundUpdateResult.background_url;
    }
    const game = await databaseUtils.partialUpdate('game', id, updateFields);
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

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const game = await databaseUtils.findOne('game', id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const deleted = await databaseUtils.delete('game', id);
    if (deleted) {
      if (game.image_url) {
        const imageFilePath = path.join(__dirname, '..', game.image_url);
        await deleteFile(imageFilePath);
      }
      if (game.background_url) {
        const backgroundFilePath = path.join(__dirname, '..', game.background_url);
        await deleteFile(backgroundFilePath);
      }
      res.status(204).send();
    } else {
      res.status(500).json({ error: 'Failed to delete game' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;