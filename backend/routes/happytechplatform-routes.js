const express = require('express');
const router = express.Router();
const databaseUtils = require('../utils/databaseUtils');
const { createDynamicTable, alterDynamicTable } = require('../utils/dynamicTableUtils');

// Data Models Routes
router.post('/data-models', async (req, res) => {
  try {
    const dataModel = await databaseUtils.create('data_models', req.body);
    await createDynamicTable(dataModel);
    res.status(201).json(dataModel);
  } catch (err) {
    console.error('Error creating data model:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.get('/data-models', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const dataModels = await databaseUtils.findAll('data_models', filterQuery);
    res.json(dataModels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/data-models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dataModel = await databaseUtils.findOne('data_models', id);
    if (!dataModel) {
      res.status(404).json({ error: 'Data model not found' });
    } else {
      res.json(dataModel);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/data-models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dataModel = await databaseUtils.update('data_models', id, req.body);
    if (!dataModel) {
      res.status(404).json({ error: 'Data model not found' });
    } else {
      res.json(dataModel);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/data-models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await databaseUtils.delete('data_models', id);
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Data model not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Field Types Routes
router.post('/field-types', async (req, res) => {
  try {
    const fieldType = await databaseUtils.create('field_types', req.body);
    res.status(201).json(fieldType);
  } catch (err) {
    console.error('Error creating field type:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.get('/field-types', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const fieldTypes = await databaseUtils.findAll('field_types', filterQuery);
    res.json(fieldTypes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/field-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fieldType = await databaseUtils.findOne('field_types', id);
    if (!fieldType) {
      res.status(404).json({ error: 'Field type not found' });
    } else {
      res.json(fieldType);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/field-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fieldType = await databaseUtils.update('field_types', id, req.body);
    if (!fieldType) {
      res.status(404).json({ error: 'Field type not found' });
    } else {
      res.json(fieldType);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/field-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await databaseUtils.delete('field_types', id);
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Field type not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Data Model Fields Routes
router.post('/data-model-fields', async (req, res) => {
  try {
    const field = await databaseUtils.create('data_model_fields', req.body);
    await alterDynamicTable('add', field);
    res.status(201).json(field);
  } catch (err) {
    console.error('Error creating data model field:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.get('/data-model-fields', async (req, res) => {
  try {
    const filterQuery = req.query ? databaseUtils.parseFilterQuery(req.query) : '';
    const fields = await databaseUtils.findAll('data_model_fields', filterQuery);
    res.json(fields);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/data-model-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const field = await databaseUtils.findOne('data_model_fields', id);
    if (!field) {
      res.status(404).json({ error: 'Data model field not found' });
    } else {
      res.json(field);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/data-model-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const oldField = await databaseUtils.findOne('data_model_fields', id);
    const updatedField = await databaseUtils.update('data_model_fields', id, req.body);
    if (!updatedField) {
      res.status(404).json({ error: 'Data model field not found' });
    } else {
      await alterDynamicTable('modify', oldField, updatedField);
      res.json(updatedField);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/data-model-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const field = await databaseUtils.findOne('data_model_fields', id);
    if (!field) {
      return res.status(404).json({ error: 'Data model field not found' });
    }
    const deleted = await databaseUtils.delete('data_model_fields', id);
    if (deleted) {
      await alterDynamicTable('remove', field);
      res.status(204).send();
    } else {
      res.status(500).json({ error: 'Failed to delete data model field' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;