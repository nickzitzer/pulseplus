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
    const pointSystem = await databaseUtils.create('point_system', { ...req.body, image_url: imageData.image_url });
    res.status(201).json(pointSystem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const pointSystems = await databaseUtils.findAll('point_system', filterQuery);
    res.json(pointSystems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pointSystem = await databaseUtils.findOne('point_system', req.params.id);
    if (!pointSystem) {
      res.status(404).json({ error: 'Point System not found' });
    } else {
      res.json(pointSystem);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const imageData = await processImageUpload(req.file, 'image_url', id, 'point_system');
    const pointSystem = await databaseUtils.update('point_system', id, { ...req.body, image_url: imageData.image_url });
    if (!pointSystem) {
      res.status(404).json({ error: 'Point System not found' });
    } else {
      if (imageData.oldImageUrl) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(pointSystem);
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
    const imageData = await processImageUpload(req.file, 'image_url', id, 'point_system');
    if (imageData.image_url) {
      updateFields.image_url = imageData.image_url;
    }
    const pointSystem = await databaseUtils.partialUpdate('point_system', id, updateFields);
    if (!pointSystem) {
      res.status(404).json({ error: 'Point System not found' });
    } else {
      if (imageData.oldImageUrl && imageData.oldImageUrl !== pointSystem.image_url) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(pointSystem);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('point_system', req.params.id);
    if (!deleted) {
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