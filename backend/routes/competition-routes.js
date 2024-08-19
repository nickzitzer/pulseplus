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
    const competition = await databaseUtils.create('competition', { ...req.body, image_url: imageData.image_url });
    res.status(201).json(competition);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const competitions = await databaseUtils.findAll('competition', filterQuery);
    res.json(competitions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const competition = await databaseUtils.findOne('competition', req.params.id);
    if (!competition) {
      res.status(404).json({ error: 'Competition not found' });
    } else {
      res.json(competition);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const imageData = await processImageUpload(req.file, 'image_url', id, 'competition');
    const competition = await databaseUtils.update('competition', id, { ...req.body, image_url: imageData.image_url });
    if (!competition) {
      res.status(404).json({ error: 'Competition not found' });
    } else {
      if (imageData.oldImageUrl) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(competition);
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
    const imageData = await processImageUpload(req.file, 'image_url', id, 'competition');
    if (imageData.image_url) {
      updateFields.image_url = imageData.image_url;
    }
    const competition = await databaseUtils.partialUpdate('competition', id, updateFields);
    if (!competition) {
      res.status(404).json({ error: 'Competition not found' });
    } else {
      if (imageData.oldImageUrl && imageData.oldImageUrl !== competition.image_url) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(competition);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('competition', req.params.id);
    if (!deleted) {
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