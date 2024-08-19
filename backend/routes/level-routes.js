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
    const level = await databaseUtils.create('level', { ...req.body, image_url: imageData.image_url });
    res.status(201).json(level);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const levels = await databaseUtils.findAll('level', filterQuery);
    res.json(levels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const level = await databaseUtils.findOne('level', id);
    if (!level) {
      res.status(404).json({ error: 'Level not found' });
    } else {
      res.json(level);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const imageData = await processImageUpload(req.file, 'image_url', id, 'level');
    const level = await databaseUtils.update('level', id, { ...req.body, image_url: imageData.image_url });
    if (!level) {
      res.status(404).json({ error: 'Level not found' });
    } else {
      if (imageData.oldImageUrl) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(level);
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
    const imageData = await processImageUpload(req.file, 'image_url', id, 'level');
    if (imageData.image_url) {
      updateFields.image_url = imageData.image_url;
    }
    const level = await databaseUtils.partialUpdate('level', id, updateFields);
    if (!level) {
      res.status(404).json({ error: 'Level not found' });
    } else {
      if (imageData.oldImageUrl && imageData.oldImageUrl !== level.image_url) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(level);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await databaseUtils.delete('level', id);
    if (!deleted) {
      res.status(404).json({ error: 'Level not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;