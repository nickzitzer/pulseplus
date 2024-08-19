const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { processImageUpload, deleteFile } = require('../utils/fileUtils');
const databaseUtils = require('../utils/databaseUtils');
const path = require('path');

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const imageData = await processImageUpload(req.file, 'image_url');
    const badge = await databaseUtils.create('badge', { ...req.body, image_url: imageData.image_url });
    res.status(201).json(badge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const badges = await databaseUtils.findAll('badge', filterQuery);
    res.json(badges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const badge = await databaseUtils.findOne('badge', id);
    if (!badge) {
      res.status(404).json({ error: 'Badge not found' });
    } else {
      res.json(badge);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const imageData = await processImageUpload(req.file, 'image_url', id, 'badge');
    const badge = await databaseUtils.update('badge', id, { ...req.body, image_url: imageData.image_url });
    if (!badge) {
      res.status(404).json({ error: 'Badge not found' });
    } else {
      if (imageData.oldImageUrl) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(badge);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    const imageData = await processImageUpload(req.file, 'image_url', id, 'badge');
    if (imageData.image_url) {
      updateFields.image_url = imageData.image_url;
    }
    const badge = await databaseUtils.partialUpdate('badge', id, updateFields);
    if (!badge) {
      res.status(404).json({ error: 'Badge not found' });
    } else {
      if (imageData.oldImageUrl && imageData.oldImageUrl !== badge.image_url) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(badge);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await databaseUtils.delete('badge', id);
    if (!deleted) {
      res.status(404).json({ error: 'Badge not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;