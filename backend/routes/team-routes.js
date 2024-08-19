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
    const team = await databaseUtils.create('team', { ...req.body, image_url: imageData.image_url });
    res.status(201).json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const teams = await databaseUtils.findAll('team', filterQuery);
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const team = await databaseUtils.findOne('team', id);
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
    } else {
      res.json(team);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const imageData = await processImageUpload(req.file, 'image_url', id, 'team');
    const team = await databaseUtils.update('team', id, { ...req.body, image_url: imageData.image_url });
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
    } else {
      if (imageData.oldImageUrl) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(team);
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
    const imageData = await processImageUpload(req.file, 'image_url', id, 'team');
    if (imageData.image_url) {
      updateFields.image_url = imageData.image_url;
    }
    const team = await databaseUtils.partialUpdate('team', id, updateFields);
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
    } else {
      if (imageData.oldImageUrl && imageData.oldImageUrl !== team.image_url) {
        const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
        await deleteFile(oldFilePath);
      }
      res.json(team);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await databaseUtils.delete('team', id);
    if (!deleted) {
      res.status(404).json({ error: 'Team not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;