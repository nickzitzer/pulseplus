const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');
const bcrypt = require('bcrypt');

router.post('/', async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    
    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const user = await databaseUtils.create('sys_user', { ...userData, password_hash });
    
    // Remove password_hash from the response
    const { password_hash: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const users = await databaseUtils.findAll('sys_user', filterQuery);
    // Remove password_hash from each user object
    const usersWithoutPassword = users.map(({ password_hash, ...user }) => user);
    res.json(usersWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await databaseUtils.findOne('sys_user', req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    } else {
      // Remove password_hash from the user object
      const { password_hash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...updateData } = req.body;

    if (password) {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      updateData.password_hash = password_hash;
    }

    const user = await databaseUtils.update('sys_user', id, updateData);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    } else {
      // Remove password_hash from the response
      const { password_hash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...updateFields } = req.body;

    if (password) {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      updateFields.password_hash = password_hash;
    }

    const user = await databaseUtils.partialUpdate('sys_user', id, updateFields);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    } else {
      // Remove password_hash from the response
      const { password_hash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseUtils.delete('sys_user', req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;