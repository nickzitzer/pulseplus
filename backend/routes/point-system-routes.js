const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { processImageUpload, deleteFile, handleFileUpdate } = require('../utils/fileUtils');
const databaseUtils = require('../utils/databaseUtils');
const path = require('path');

router.post('/', upload.single('image_url'), async (req, res) => {
  try {
    const imageData = await processImageUpload(req.file, 'image_url');
    const pointSystem = await databaseUtils.create('point_system', {
      ...req.body,
      image_url: imageData.image_url
    });
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

router.put('/:id', upload.single('image_url'), async (req, res) => {
  try {
    const { id } = req.params;
    const fileUpdateResult = await handleFileUpdate(req.file, 'image_url', id, 'point_system');
    const pointSystem = await databaseUtils.update('point_system', id, {
      ...req.body,
      image_url: fileUpdateResult.image_url
    });
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

router.patch('/:id', upload.single('image_url'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    const fileUpdateResult = await handleFileUpdate(req.file, 'image_url', id, 'point_system');
    if (fileUpdateResult.image_url) {
      updateFields.image_url = fileUpdateResult.image_url;
    }
    const pointSystem = await databaseUtils.partialUpdate('point_system', id, updateFields);
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

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pointSystem = await databaseUtils.findOne('point_system', id);
    if (!pointSystem) {
      return res.status(404).json({ error: 'Point System not found' });
    }
    const deleted = await databaseUtils.delete('point_system', id);
    if (deleted) {
      if (pointSystem.image_url) {
        const filePath = path.join(__dirname, '..', pointSystem.image_url);
        await deleteFile(filePath);
      }
      res.status(204).send();
    } else {
      res.status(500).json({ error: 'Failed to delete point system' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;