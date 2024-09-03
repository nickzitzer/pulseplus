const { pool } = require('../db');
const databaseUtils = require('./databaseUtils');

const createDynamicTable = async (dataModel) => {
  const { name, fields } = dataModel;
  const tableName = `dynamic_${name.toLowerCase()}`;

  let query = `CREATE TABLE IF NOT EXISTS ${tableName} (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  `;

  for (const field of fields) {
    const sqlType = await getSQLType(field.type);
    query += `, ${field.name} ${sqlType}`;
  }

  query += ')';

  try {
    await pool.query(query);
    console.log(`Dynamic table ${tableName} created successfully`);
  } catch (error) {
    console.error(`Error creating dynamic table ${tableName}:`, error);
    throw error;
  }
};

const alterDynamicTable = async (action, field, updatedField = null) => {
  const tableName = `dynamic_${field.model_name.toLowerCase()}`;
  let query;

  switch (action) {
    case 'add':
      const addSqlType = await getSQLType(field.type);
      query = `ALTER TABLE ${tableName} ADD COLUMN ${field.name} ${addSqlType}`;
      break;
    case 'modify':
      const modifySqlType = await getSQLType(updatedField.type);
      query = `ALTER TABLE ${tableName} ALTER COLUMN ${field.name} TYPE ${modifySqlType}`;
      break;
    case 'remove':
      query = `ALTER TABLE ${tableName} DROP COLUMN ${field.name}`;
      break;
    default:
      throw new Error('Invalid action for altering dynamic table');
  }

  try {
    await pool.query(query);
    console.log(`Dynamic table ${tableName} altered successfully`);
  } catch (error) {
    console.error(`Error altering dynamic table ${tableName}:`, error);
    throw error;
  }
};

const getSQLType = async (fieldType) => {
  try {
    const result = await databaseUtils.findOne('field_types', fieldType);
    if (result) {
      return result.data_type;
    } else {
      console.warn(`Field type '${fieldType}' not found in field_types table. Defaulting to TEXT.`);
      return 'TEXT';
    }
  } catch (error) {
    console.error('Error querying field_types table:', error);
    return 'TEXT';
  }
};

module.exports = {
  createDynamicTable,
  alterDynamicTable
};