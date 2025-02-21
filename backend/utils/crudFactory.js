/**
 * @module crudFactory
 * @description Factory for creating standardized CRUD operations for database tables
 * @requires ../db
 */

const { pool } = require('../db');

/**
 * @typedef {Object} CrudOptions
 * @property {number} [limit=10] - Number of records to return
 * @property {number} [offset=0] - Number of records to skip
 * @property {string} [orderBy='created_at'] - Field to order by
 * @property {string} [order='DESC'] - Sort order ('ASC' or 'DESC')
 */

/**
 * @function createCrudOperations
 * @description Creates a set of CRUD operations for a database table
 * @param {string} tableName - Name of the database table
 * @param {string[]} fields - Array of field names in the table
 * @returns {Object} Object containing CRUD operations
 * 
 * @example
 * const userCrud = createCrudOperations('users', ['name', 'email', 'role']);
 * await userCrud.create({ name: 'John', email: 'john@example.com' });
 */
const createCrudOperations = (tableName, fields) => {
  return {
    /**
     * @async
     * @function create
     * @description Creates a new record in the table
     * @param {Object} data - Data to insert
     * @returns {Promise<Object>} Created record
     * @throws {Error} If database operation fails
     */
    async create(data) {
      const validFields = fields.filter(field => data[field] !== undefined);
      const values = validFields.map(field => data[field]);
      const query = `
        INSERT INTO ${tableName} (${validFields.join(', ')})
        VALUES (${validFields.map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
      `;
      
      try {
        const result = await pool.query(query, values);
        return result.rows[0];
      } catch (error) {
        console.error(`Error creating ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * @async
     * @function findAll
     * @description Retrieves all records from the table with pagination
     * @param {CrudOptions} [options={}] - Query options
     * @returns {Promise<Object[]>} Array of records
     * @throws {Error} If database operation fails
     */
    async findAll(options = {}) {
      const { limit = 10, offset = 0, orderBy = 'created_at', order = 'DESC' } = options;
      const query = `
        SELECT * FROM ${tableName}
        ORDER BY ${orderBy} ${order}
        LIMIT $1 OFFSET $2
      `;
      
      try {
        const result = await pool.query(query, [limit, offset]);
        return result.rows;
      } catch (error) {
        console.error(`Error finding all ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * @async
     * @function findById
     * @description Retrieves a single record by its ID
     * @param {string} id - Record ID
     * @returns {Promise<Object|null>} Found record or null
     * @throws {Error} If database operation fails
     */
    async findById(id) {
      const query = `
        SELECT * FROM ${tableName}
        WHERE sys_id = $1
      `;
      
      try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
      } catch (error) {
        console.error(`Error finding ${tableName} by id:`, error);
        throw error;
      }
    },

    /**
     * @async
     * @function update
     * @description Updates a record by its ID
     * @param {string} id - Record ID
     * @param {Object} data - Update data
     * @returns {Promise<Object|null>} Updated record or null
     * @throws {Error} If database operation fails
     */
    async update(id, data) {
      const validFields = fields.filter(field => data[field] !== undefined);
      const values = validFields.map(field => data[field]);
      const query = `
        UPDATE ${tableName}
        SET ${validFields.map((field, i) => `${field} = $${i + 1}`).join(', ')}
        WHERE sys_id = $${validFields.length + 1}
        RETURNING *
      `;
      
      try {
        const result = await pool.query(query, [...values, id]);
        return result.rows[0];
      } catch (error) {
        console.error(`Error updating ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * @async
     * @function delete
     * @description Deletes a record by its ID
     * @param {string} id - Record ID
     * @returns {Promise<Object|null>} Deleted record or null
     * @throws {Error} If database operation fails
     */
    async delete(id) {
      const query = `
        DELETE FROM ${tableName}
        WHERE sys_id = $1
        RETURNING *
      `;
      
      try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
      } catch (error) {
        console.error(`Error deleting ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * @async
     * @function findByField
     * @description Finds records by a specific field value
     * @param {string} field - Field name to search by
     * @param {*} value - Value to search for
     * @returns {Promise<Object[]>} Array of matching records
     * @throws {Error} If database operation fails
     */
    async findByField(field, value) {
      const query = `
        SELECT * FROM ${tableName}
        WHERE ${field} = $1
      `;
      
      try {
        const result = await pool.query(query, [value]);
        return result.rows;
      } catch (error) {
        console.error(`Error finding ${tableName} by field:`, error);
        throw error;
      }
    }
  };
};

module.exports = createCrudOperations; 