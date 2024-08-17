const { pool } = require('../db');

const databaseUtils = {
  async create(tableName, data) {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;

    try {
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (err) {
      throw err;
    }
  },

  async findAll(tableName, filterQuery = '') {
    let query = `SELECT * FROM ${tableName}`;
    if (filterQuery) {
      query += ` WHERE ${filterQuery}`;
    }

    try {
      const { rows } = await pool.query(query);
      return rows;
    } catch (err) {
      throw err;
    }
  },

  async findOne(tableName, id) {
    const query = `SELECT * FROM ${tableName} WHERE sys_id = $1`;

    try {
      const { rows } = await pool.query(query, [id]);
      return rows[0];
    } catch (err) {
      throw err;
    }
  },

  async update(tableName, id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    const query = `UPDATE ${tableName} SET ${setClause} WHERE sys_id = $${columns.length + 1} RETURNING *`;

    try {
      const { rows } = await pool.query(query, [...values, id]);
      return rows[0];
    } catch (err) {
      throw err;
    }
  },

  async partialUpdate(tableName, id, data) {
    const updateFields = Object.keys(data)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = Object.values(data);
    values.push(id); // Add the id value to the end of the values array

    // Construct the SQL query with proper syntax
    const query = `UPDATE ${tableName} SET ${updateFields} WHERE sys_id = $${values.length} RETURNING *`;

    try {
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (err) {
      throw err;
    }
  },

  async delete(tableName, id) {
    const query = `DELETE FROM ${tableName} WHERE sys_id = $1`;

    try {
      const { rowCount } = await pool.query(query, [id]);
      return rowCount > 0;
    } catch (err) {
      throw err;
    }
  },
};

module.exports = databaseUtils;