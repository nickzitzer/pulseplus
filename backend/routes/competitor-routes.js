const express = require('express');
const router = express.Router();
const { parseFilterQuery } = require('../db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { processImageUpload, deleteFile, handleFileUpdate } = require('../utils/fileUtils');
const databaseUtils = require('../utils/databaseUtils');
const path = require('path');

// Create a new competitor
router.post('/', upload.single('avatar'), async (req, res) => {
  try {
    const { user_id, total_earnings, account_balance, performance_group } = req.body;
    const imageData = await processImageUpload(req.file, 'avatar_url');
    const competitor = await databaseUtils.create('competitor', {
      user_id,
      total_earnings,
      account_balance,
      performance_group,
      avatar_url: imageData.avatar_url,
    });
    res.status(201).json(competitor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current competitor
router.get('/current', async (req, res) => {
  if (!req.user) {
    return res.status(400).json({ error: 'No user object on request' });
  }

  const userId = req.user.sys_id || req.user.id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID not found in the authenticated user object' });
  }

  try {
    const competitor = await databaseUtils.findOne('competitor', `user_id = '${userId}'`);
    if (!competitor) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    res.json(competitor);
  } catch (err) {
    console.error('Error in /competitor/current:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Read a single competitor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const competitor = await databaseUtils.findOne('competitor', `sys_id = '${id}'`);
    if (!competitor) {
      res.status(404).json({ error: 'Competitor not found' });
    } else {
      res.json(competitor);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Read all competitors (with optional filtering)
router.get('/', async (req, res) => {
  try {
    const filterQuery = parseFilterQuery(req.query);
    const competitors = await databaseUtils.findAll('competitor', filterQuery);
    res.json(competitors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a competitor
router.put('/:id', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, total_earnings, account_balance, performance_group } = req.body;
    
    const fileUpdateResult = await handleFileUpdate(req.file, 'avatar_url', id, 'competitor');

    const competitor = await databaseUtils.update('competitor', id, {
      user_id,
      total_earnings,
      account_balance,
      performance_group,
      avatar_url: fileUpdateResult.avatar_url,
    });

    if (!competitor) {
      res.status(404).json({ error: 'Competitor not found' });
    } else {
      res.json(competitor);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update of a competitor
router.patch('/:id', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const fileUpdateResult = await handleFileUpdate(req.file, 'avatar_url', id, 'competitor');

    if (fileUpdateResult.avatar_url) {
      updateFields.avatar_url = fileUpdateResult.avatar_url;
    }

    const competitor = await databaseUtils.partialUpdate('competitor', id, updateFields);

    if (!competitor) {
      res.status(404).json({ error: 'Competitor not found' });
    } else {
      res.json(competitor);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a competitor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch the competitor to get the avatar_url before deletion
    const competitor = await databaseUtils.findOne('competitor', `sys_id = '${id}'`);
    
    if (!competitor) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    // Delete the competitor from the database
    const deleted = await databaseUtils.delete('competitor', id);
    
    if (deleted) {
      // If deletion was successful and there's an avatar_url, delete the file
      if (competitor.avatar_url) {
        const filePath = path.join(__dirname, '..', competitor.avatar_url);
        await deleteFile(filePath);
      }
      res.status(204).send();
    } else {
      res.status(500).json({ error: 'Failed to delete competitor' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;